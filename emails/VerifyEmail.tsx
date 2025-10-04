import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VerifyEmailProps {
  firstName?: string;
  verificationUrl: string;
}

export const VerifyEmail = ({
  firstName = "there",
  verificationUrl,
}: VerifyEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address to get started</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to VAI! 🎉</Heading>

          <Text style={text}>Hi {firstName},</Text>

          <Text style={text}>
            Thanks for signing up! We're excited to have you on board.
            To get started, please verify your email address by clicking the button below:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>

          <Text style={link}>
            <Link href={verificationUrl} style={linkStyle}>
              {verificationUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>Important:</strong> This verification link will expire in 24 hours.
            If you didn't create an account, you can safely ignore this email.
          </Text>

          <Text style={footer}>
            Need help? Reply to this email or contact us at support@vai.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default VerifyEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "28px",
  fontWeight: "700",
  margin: "40px 0",
  padding: "0 40px",
  textAlign: "center" as const,
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 40px",
};

const buttonContainer = {
  padding: "27px 0 27px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#6366f1",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
};

const link = {
  color: "#6366f1",
  fontSize: "14px",
  margin: "16px 0",
  padding: "0 40px",
  wordBreak: "break-all" as const,
};

const linkStyle = {
  color: "#6366f1",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 40px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "16px 0",
  padding: "0 40px",
};
