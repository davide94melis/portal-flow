import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import type { UserRole } from "@/types/next-auth";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return false;
  }
  return true;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const keys = await redis.keys("user:*");
  const users: Omit<StoredUser, "passwordHash">[] = [];

  for (const key of keys) {
    const user = await redis.get<StoredUser>(key);
    if (user) {
      const { passwordHash: _, ...safe } = user;
      users.push(safe);
    }
  }

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role } = body as {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  };

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const existing = await redis.get(`user:${email}`);
  if (existing) {
    return NextResponse.json(
      { error: "User already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  const user: StoredUser = { id, name, email, passwordHash, role };
  await redis.set(`user:${email}`, user);

  const { passwordHash: _, ...safe } = user;
  return NextResponse.json(safe, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  await redis.del(`user:${email}`);
  return NextResponse.json({ ok: true });
}
