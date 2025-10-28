"use client";

/**
 * Password Strength Meter Component
 *
 * Visual indicator of password strength with requirements checklist.
 * Uses zxcvbn for strength calculation (0-4 scale).
 */

import { useEffect, useState } from "react";
import zxcvbn from "zxcvbn";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  /** Callback when password meets all requirements */
  onStrengthChange?: (isStrong: boolean) => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
  regex?: RegExp;
  check?: (password: string) => boolean;
}

export function PasswordStrengthMeter({
  password,
  onStrengthChange,
}: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState(0);

  // Password requirements
  const requirements: PasswordRequirement[] = [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(password),
      regex: /[A-Z]/,
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(password),
      regex: /[a-z]/,
    },
    {
      label: "Contains number",
      met: /[0-9]/.test(password),
      regex: /[0-9]/,
    },
    {
      label: "Contains special character (!@#$%^&*)",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      regex: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    },
  ];

  const allRequirementsMet = requirements.every((req) => req.met);

  // Calculate strength using zxcvbn
  useEffect(() => {
    if (password.length === 0) {
      setStrength(0);
      onStrengthChange?.(false);
      return;
    }

    const result = zxcvbn(password);
    setStrength(result.score); // 0-4
    onStrengthChange?.(result.score >= 3 && allRequirementsMet);
  }, [password, allRequirementsMet, onStrengthChange]);

  // Don't show anything if password is empty
  if (password.length === 0) {
    return null;
  }

  // Strength labels and colors
  const strengthConfig = [
    { label: "Very Weak", color: "bg-red-500", textColor: "text-red-600" },
    { label: "Weak", color: "bg-red-400", textColor: "text-red-500" },
    { label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-600" },
    { label: "Good", color: "bg-green-400", textColor: "text-green-600" },
    { label: "Strong", color: "bg-green-500", textColor: "text-green-600" },
  ];

  const currentStrength = strengthConfig[strength];

  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Password strength:
          </span>
          <span
            className={`text-sm font-medium ${currentStrength.textColor}`}
            aria-label={`Password strength: ${currentStrength.label}`}
          >
            {currentStrength.label}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${currentStrength.color}`}
            style={{ width: `${((strength + 1) / 5) * 100}%` }}
            role="progressbar"
            aria-valuenow={strength}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label="Password strength indicator"
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">
          Requirements:
        </p>
        <ul className="space-y-1" role="list">
          {requirements.map((req, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-sm"
              role="listitem"
            >
              {req.met ? (
                <Check
                  className="h-4 w-4 text-green-600"
                  aria-label="Requirement met"
                />
              ) : (
                <X
                  className="h-4 w-4 text-muted-foreground"
                  aria-label="Requirement not met"
                />
              )}
              <span
                className={
                  req.met
                    ? "text-foreground"
                    : "text-muted-foreground"
                }
              >
                {req.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Additional feedback for very weak passwords */}
      {strength === 0 && password.length >= 8 && (
        <p className="text-sm text-yellow-600">
          Try using a mix of letters, numbers, and symbols to make your password
          stronger.
        </p>
      )}
    </div>
  );
}
