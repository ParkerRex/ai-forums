// Authentication-related type definitions

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  slug: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  status: string;
  tier?: string;
}

export interface Session {
  id: string;
  memberId: string;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  user: User;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Password validation result
export interface PasswordStrengthResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}
