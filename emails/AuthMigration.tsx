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

interface AuthMigrationProps {
  firstName?: string;
  setPasswordUrl: string;
}

export const AuthMigration = ({
  firstName = "there",
  setPasswordUrl,
}: AuthMigrationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Action Required: Set Your Password - VAI Authentication Upgrade</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔒 Important: Set Your Password</Heading>

          <Text style={text}>Hi {firstName},</Text>

          <Text style={text}>
            We're upgrading VAI to a more secure authentication system to better
            protect your account and data.
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>What's changing?</strong>
            </Text>
            <Text style={infoText}>
              We're moving from third-party authentication to our own secure system.
              This gives us better control over security and improves your experience.
            </Text>
            <Text style={infoText}>
              <strong>Your data is completely safe</strong> - we're just updating how you sign in.
            </Text>
          </Section>

          <Text style={text}>
            <strong>Action Required:</strong> Please set a password for your account
            by clicking the button below:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={setPasswordUrl}>
              Set My Password
            </Button>
          </Section>

          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>

          <Text style={link}>
            <Link href={setPasswordUrl} style={linkStyle}>
              {setPasswordUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Section style={urgencyBox}>
            <Text style={urgencyText}>
              ⏰ <strong>Please complete this by: 7 days from now</strong>
            </Text>
            <Text style={urgencyText}>
              After this deadline, you'll need to contact support to regain access
              to your account.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            <strong>What happens after I set my password?</strong>
          </Text>

          <Text style={listItem}>
            1. Click the "Set My Password" button above
          </Text>
          <Text style={listItem}>
            2. Create a secure password (we'll help you choose a strong one)
          </Text>
          <Text style={listItem}>
            3. Verify your email address (we'll send you a quick link)
          </Text>
          <Text style={listItem}>
            4. Sign in with your new credentials - you're all set!
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>Need help?</strong> We're here for you! Reply to this email or
            contact us at support@vai.com
          </Text>

          <Text style={footer}>
            Rest assured, your account data, posts, and settings remain completely
            unchanged. This is purely a sign-in method update for enhanced security.
          </Text>

          <Text style={footer}>
            Thank you for your understanding and cooperation!
            <br />
            The VAI Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AuthMigration;

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

const listItem = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "8px 0",
  padding: "0 40px 0 56px",
};

const buttonContainer = {
  padding: "27px 0 27px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#7c3aed",
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
  color: "#7c3aed",
  fontSize: "14px",
  margin: "16px 0",
  padding: "0 40px",
  wordBreak: "break-all" as const,
};

const linkStyle = {
  color: "#7c3aed",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 40px",
};

const infoBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  margin: "20px 40px",
  padding: "16px",
};

const infoText = {
  color: "#1e40af",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0",
};

const urgencyBox = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  margin: "20px 40px",
  padding: "16px",
};

const urgencyText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "16px 0",
  padding: "0 40px",
};
