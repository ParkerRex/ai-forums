import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SignInFormProps {
  signInWithEmail: (emailAddress: string) => void;
  clerkError: string;
}

const SignInForm = ({ signInWithEmail, clerkError }: SignInFormProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Sign In</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const target = e.target as typeof e.target & {
              email: { value: string };
            };
            const email = target.email.value;
            signInWithEmail(email);
          }}
        >
          <Input
            name="email"
            placeholder="Email address"
            type="email"
            required
            className="mb-6"
          />
          {clerkError && (
            <p className="mb-6 text-sm text-destructive">{clerkError}</p>
          )}
          <Button className="w-full" type="submit">
            Send sign-in code
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?
          <Link className="ml-1 text-primary hover:underline" href="/sign-up">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInForm;
