"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import SignUpForm from "../SignUpForm";
import VerifyForm from "../VerifyForm";

const Signup = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [clerkError, setClerkError] = useState("");
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  const signUpWithEmail = async (emailAddress: string) => {
    if (!isLoaded) {
      return;
    }

    try {
      await signUp.create({
        emailAddress,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: any) {
      setClerkError(err.errors?.[0]?.message ?? "Something went wrong");
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/");
      }
    } catch (err) {
      console.log("Error:", JSON.stringify(err, null, 2));
    }
  };

  return !verifying ? (
    <SignUpForm signUpWithEmail={signUpWithEmail} clerkError={clerkError} />
  ) : (
    <VerifyForm handleVerify={handleVerify} code={code} setCode={setCode} />
  );
};

export default Signup;
