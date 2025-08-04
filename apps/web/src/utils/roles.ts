import { Roles } from "../types/globals"
import { auth } from "@clerk/nextjs/server"

// Basic Role implementation https://clerk.com/docs/references/nextjs/basic-rbac

export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata.role === role
}
