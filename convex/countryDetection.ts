/**
 * @fileoverview Country Detection Module - AI-powered country detection from location strings
 */

import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation } from "./_generated/server";

/**
 * Detects country from a location string using OpenAI's GPT-4o-mini model.
 *
 * @param location - The location string (e.g., "San Francisco, CA", "London", "東京")
 * @returns ISO 3166-1 alpha-2 country code or null if not detected
 */
export const detectCountryFromLocationAI = action({
  args: {
    location: v.string(),
  },
  handler: async (_ctx, { location }) => {
    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      return null;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a location parser that identifies countries from location strings.
Given a location string, return ONLY the ISO 3166-1 alpha-2 country code (2 letters).
If you cannot determine the country with confidence, return "UNKNOWN".
Examples:
- "San Francisco, CA" → US
- "London" → GB
- "Paris, France" → FR
- "Tokyo" → JP
- "Sydney, NSW" → AU
- "Toronto, ON" → CA
- "Berlin" → DE
- "São Paulo" → BR
- "Mumbai" → IN
- "北京" → CN
- "Remote" → UNKNOWN`,
          },
          {
            role: "user",
            content: location,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 10,
      });

      const countryCode = completion.choices[0]?.message?.content?.trim().toUpperCase();

      // Validate the response is a 2-letter code
      if (countryCode && countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
        return countryCode;
      } else if (countryCode === "UNKNOWN") {
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error detecting country with AI:", error);
      return null;
    }
  },
});

/**
 * Internal action for detecting country - can be called from mutations
 */
export const detectCountryFromLocationAIInternal = internalAction({
  args: {
    location: v.string(),
  },
  handler: async (_ctx, { location }) => {
    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      return null;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a location parser that identifies countries from location strings.
Given a location string, return ONLY the ISO 3166-1 alpha-2 country code (2 letters).
If you cannot determine the country with confidence, return "UNKNOWN".
Examples:
- "San Francisco, CA" → US
- "London" → GB
- "Paris, France" → FR
- "Tokyo" → JP
- "Sydney, NSW" → AU
- "Toronto, ON" → CA
- "Berlin" → DE
- "São Paulo" → BR
- "Mumbai" → IN
- "北京" → CN
- "Remote" → UNKNOWN`,
          },
          {
            role: "user",
            content: location,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 10,
      });

      const countryCode = completion.choices[0]?.message?.content?.trim().toUpperCase();

      // Validate the response is a 2-letter code
      if (countryCode && countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
        return countryCode;
      } else if (countryCode === "UNKNOWN") {
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error detecting country with AI:", error);
      return null;
    }
  },
});

/**
 * Internal action that detects country and updates member record
 */
export const detectAndUpdateCountryAI = internalAction({
  args: {
    memberId: v.id("members"),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      return;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a location parser that identifies countries from location strings.
Given a location string, return ONLY the ISO 3166-1 alpha-2 country code (2 letters).
If you cannot determine the country with confidence, return "UNKNOWN".
Examples:
- "San Francisco, CA" → US
- "London" → GB
- "Paris, France" → FR
- "Tokyo" → JP
- "Sydney, NSW" → AU
- "Toronto, ON" → CA
- "Berlin" → DE
- "São Paulo" → BR
- "Mumbai" → IN
- "北京" → CN
- "Remote" → UNKNOWN`,
          },
          {
            role: "user",
            content: args.location,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 10,
      });

      const countryCode = completion.choices[0]?.message?.content?.trim().toUpperCase();

      // Validate the response is a 2-letter code
      if (countryCode && countryCode.length === 2 && /^[A-Z]{2}$/.test(countryCode)) {
        // Update the member record
        await ctx.runMutation(internal.countryDetection.updateMemberCountry, {
          memberId: args.memberId,
          country: countryCode,
        });
        console.log(`Updated country for member ${args.memberId} to ${countryCode} using AI`);
      } else {
        console.log(`Could not detect country for location: ${args.location}`);
      }
    } catch (error) {
      console.error("Error detecting country with AI:", error);
    }
  },
});

/**
 * Internal mutation to update member country
 */
export const updateMemberCountry = internalMutation({
  args: {
    memberId: v.id("members"),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, {
      country: args.country,
    });
  },
});
