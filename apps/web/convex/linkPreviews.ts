import { action } from "./_generated/server";
import { v } from "convex/values";

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

export const fetchLinkPreview = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<OpenGraphData> => {
    const { url } = args;
    
    // Validate URL
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${error}`);
    }

    try {
      // Fetch the page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VAI-Bot/1.0 (+https://vai.vex.dev)',
        },
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse OpenGraph and basic meta tags
      const ogData: OpenGraphData = { url };
      
      // Extract title
      const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/i) ||
                        html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) {
        ogData.title = titleMatch[1].trim();
      }
      
      // Extract description
      const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"[^>]*>/i) ||
                       html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i);
      if (descMatch) {
        ogData.description = descMatch[1].trim();
      }
      
      // Extract image
      const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"[^>]*>/i);
      if (imageMatch) {
        ogData.image = imageMatch[1].trim();
      }
      
      // Extract site name
      const siteMatch = html.match(/<meta\s+property="og:site_name"\s+content="([^"]*)"[^>]*>/i);
      if (siteMatch) {
        ogData.siteName = siteMatch[1].trim();
      }
      
      return ogData;
      
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
      
      // Return minimal data with just the URL and hostname as title
      try {
        const hostname = new URL(url).hostname;
        return {
          url,
          title: hostname,
          description: `Link to ${hostname}`,
        };
      } catch {
        return {
          url,
          title: 'External Link',
          description: 'Unable to load preview',
        };
      }
    }
  },
});

export const validateUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const { url } = args;
    
    try {
      const parsedUrl = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Block localhost and private IPs for security
      const hostname = parsedUrl.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
      ) {
        return false;
      }
      
      // Block javascript: and data: schemes
      if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  },
}); 