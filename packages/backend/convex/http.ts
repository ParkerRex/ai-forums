import "./polyfills";
import { httpRouter } from "convex/server";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../lib/auth";
import { httpAction } from "./_generated/server";
import { resend } from "./email";

const http = httpRouter();

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

betterAuthComponent.registerRoutes(http, createAuth);

export default http;
