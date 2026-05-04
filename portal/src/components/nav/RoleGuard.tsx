import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/next-auth";

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export async function RoleGuard({ roles, children }: RoleGuardProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!roles.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
