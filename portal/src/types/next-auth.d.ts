import { DefaultSession } from "next-auth";

export type UserRole = "funzionale" | "tech_lead" | "dev" | "admin";

declare module "next-auth" {
  interface User {
    role: UserRole;
  }

  interface Session {
    user: {
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
  }
}
