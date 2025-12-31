"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type User = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	slug: string;
	avatarUrl: string | null;
	bio: string | null;
	role: string;
	status: string;
};

type AuthContextType = {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<User>;
	register: (data: RegisterData) => Promise<User>;
	logout: () => Promise<void>;
	refetch: () => void;
};

type RegisterData = {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchCurrentUser(): Promise<User | null> {
	const response = await fetch("/api/auth/me");
	if (!response.ok) {
		return null;
	}
	const data = await response.json();
	return data.user;
}

async function loginRequest(
	email: string,
	password: string,
): Promise<{ user: User }> {
	const response = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Login failed");
	}

	return response.json();
}

async function registerRequest(data: RegisterData): Promise<{ user: User }> {
	const response = await fetch("/api/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Registration failed");
	}

	return response.json();
}

async function logoutRequest(): Promise<void> {
	const response = await fetch("/api/auth/logout", {
		method: "POST",
	});

	if (!response.ok) {
		throw new Error("Logout failed");
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();

	const {
		data: user,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["auth", "me"],
		queryFn: fetchCurrentUser,
		retry: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	const loginMutation = useMutation({
		mutationFn: ({ email, password }: { email: string; password: string }) =>
			loginRequest(email, password),
		onSuccess: (data) => {
			queryClient.setQueryData(["auth", "me"], data.user);
		},
	});

	const registerMutation = useMutation({
		mutationFn: (data: RegisterData) => registerRequest(data),
		onSuccess: (data) => {
			queryClient.setQueryData(["auth", "me"], data.user);
		},
	});

	const logoutMutation = useMutation({
		mutationFn: logoutRequest,
		onSuccess: () => {
			queryClient.setQueryData(["auth", "me"], null);
			queryClient.clear();
		},
	});

	const login = async (email: string, password: string): Promise<User> => {
		const result = await loginMutation.mutateAsync({ email, password });
		return result.user;
	};

	const register = async (data: RegisterData): Promise<User> => {
		const result = await registerMutation.mutateAsync(data);
		return result.user;
	};

	const logout = async (): Promise<void> => {
		await logoutMutation.mutateAsync();
	};

	return (
		<AuthContext.Provider
			value={{
				user: user ?? null,
				isLoading,
				isAuthenticated: !!user,
				login,
				register,
				logout,
				refetch,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
