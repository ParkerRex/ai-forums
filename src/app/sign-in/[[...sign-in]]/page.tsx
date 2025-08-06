"use client";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import VerifyForm from "@/app/sign-up/VerifyForm";
import SignInForm from "../SignInForm";

const SignIn = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [clerkError, setClerkError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const router = useRouter();

  const signInWithEmail = async (emailAddress: string) => {
    if (!isLoaded) {
      return;
    }

    try {
      await signIn.create({ identifier: emailAddress });
      await signIn.prepareFirstFactor({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      setClerkError(err.errors?.[0]?.message ?? "Something went wrong");
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.push("/");
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      setClerkError(err.errors?.[0]?.message ?? "Invalid code");
    }
  };

  return verifying ? (
    <VerifyForm handleVerify={handleVerify} code={code} setCode={setCode} />
  ) : (
    <SignInForm signInWithEmail={signInWithEmail} clerkError={clerkError} />
  );
};

export default SignIn;
