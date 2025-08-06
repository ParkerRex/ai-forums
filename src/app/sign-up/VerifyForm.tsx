import { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VerifyFormProps {
  handleVerify: (e: FormEvent) => void;
  code: string;
  setCode: (value: string) => void;
}

const VerifyForm = ({ handleVerify, code, setCode }: VerifyFormProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-semibold text-foreground">
          Verification Code
        </h1>
        <form onSubmit={handleVerify}>
          <Input
            value={code}
            id="code"
            name="code"
            placeholder="Enter verification code"
            onChange={(e) => setCode(e.target.value)}
            className="mb-6"
          />
          <Button className="w-full" type="submit">
            Complete sign up
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VerifyForm;
