import { SignIn } from "@clerk/nextjs";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { redirect_url?: string };
}) {
  const redirectUrl = searchParams.redirect_url;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in to VAI
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the community of AI engineers building together
          </p>
        </div>
        
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: 
                "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
              formButtonPrimary: 
                "bg-primary text-primary-foreground hover:bg-primary/90",
              footerActionLink: 
                "text-primary hover:text-primary/90",
              identityPreviewText: "text-muted-foreground",
              identityPreviewEditButton: "text-primary hover:text-primary/90",
              formFieldLabel: "text-foreground",
              formFieldInput: 
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              dividerLine: "bg-border",
              dividerText: "text-muted-foreground",
              formFieldSuccessText: "text-green-600",
              formFieldErrorText: "text-destructive",
              alertText: "text-foreground",
              alertTextDanger: "text-destructive",
            },
          }}
          afterSignInUrl={redirectUrl || "/members"}
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}