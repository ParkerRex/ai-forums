import { SignInButton } from '@clerk/clerk-react';
import React from 'react'

export default function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Log in to see the numbers</p>
      <SignInButton mode="modal">
        <button className="bg-foreground text-background px-4 py-2 rounded-md">
          Sign in
        </button>
      </SignInButton>
    </div>
  );
}