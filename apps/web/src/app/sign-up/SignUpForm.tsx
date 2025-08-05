import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SignUpFormProps {
  signUpWithEmail: (emailAddress: string) => void;
  clerkError: string;
}

const SignUpForm = ({ signUpWithEmail, clerkError }: SignUpFormProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-semibold text-foreground">Sign Up</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const target = e.target as typeof e.target & {
              email: { value: string };
            };
            signUpWithEmail(target.email.value);
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
            Create an account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?
          <Link className="ml-1 text-primary hover:underline" href="/sign-in">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpForm;
