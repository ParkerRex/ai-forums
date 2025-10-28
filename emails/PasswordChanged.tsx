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

interface PasswordChangedProps {
  firstName?: string;
  changeTime: string;
  resetUrl: string;
}

export const PasswordChanged = ({
  firstName = "there",
  changeTime,
  resetUrl,
}: PasswordChangedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your password was changed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Password Changed Successfully</Heading>

          <Text style={text}>Hi {firstName},</Text>

          <Text style={text}>
            This is a confirmation that your VAI account password was changed on {changeTime}.
          </Text>

          <Hr style={hr} />

          <Section style={warningBox}>
            <Text style={warningText}>
              <strong>Didn't make this change?</strong>
            </Text>
            <Text style={warningText}>
              If you did not change your password, your account may be compromised.
              Click the button below to reset your password immediately:
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password Now
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

          <Section style={securityTips}>
            <Text style={tipHeader}>
              <strong>Security Tips:</strong>
            </Text>
            <Text style={tipText}>
              • Use a unique password for your VAI account
            </Text>
            <Text style={tipText}>
              • Never share your password with anyone
            </Text>
            <Text style={tipText}>
              • Be cautious of phishing emails asking for your password
            </Text>
            <Text style={tipText}>
              • Change your password regularly
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Need help? Reply to this email or contact us at support@vai.com
          </Text>

          <Text style={footer}>
            This is an automated security notification from VAI. If you initiated
            this password change, no action is needed.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordChanged;

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
  margin: "8px 0",
};

const securityTips = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "8px",
  margin: "20px 40px",
  padding: "16px",
};

const tipHeader = {
  color: "#075985",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0 8px 0",
};

const tipText = {
  color: "#0c4a6e",
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
