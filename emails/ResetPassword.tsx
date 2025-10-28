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

interface ResetPasswordProps {
  firstName?: string;
  resetUrl: string;
}

export const ResetPassword = ({
  firstName = "there",
  resetUrl,
}: ResetPasswordProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Reset Request</Heading>

          <Text style={text}>Hi {firstName},</Text>

          <Text style={text}>
            We received a request to reset your password. Click the button below
            to create a new password:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>

          <Text style={link}>
            <Link href={resetUrl} style={linkStyle}>
              {resetUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Section style={warningBox}>
            <Text style={warningText}>
              <strong>Important Security Information:</strong>
            </Text>
            <Text style={warningText}>
              • This reset link will expire in 1 hour
            </Text>
            <Text style={warningText}>
              • If you didn't request a password reset, you can safely ignore this email
            </Text>
            <Text style={warningText}>
              • Your password won't change unless you click the link above and set a new one
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Need help? Reply to this email or contact us at support@vai.com
          </Text>

          <Text style={footer}>
            This email was sent from VAI. For security reasons, please do not share
            this link with anyone.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPassword;

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
  backgroundColor: "#dc2626",
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
  color: "#dc2626",
  fontSize: "14px",
  margin: "16px 0",
  padding: "0 40px",
  wordBreak: "break-all" as const,
};

const linkStyle = {
  color: "#dc2626",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 40px",
};

const warningBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  margin: "20px 40px",
  padding: "16px",
};

const warningText = {
  color: "#991b1b",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "16px 0",
  padding: "0 40px",
};
