import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { redis } from "@/lib/redis";

export async function POST() {
  const email = "admin@portal.it";
  const existing = await redis.get(`user:${email}`);
  if (existing) return NextResponse.json({ error: "Admin already exists" }, { status: 409 });

  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const user = {
    id: crypto.randomUUID(),
    name: "Admin",
    email,
    passwordHash,
    role: "admin",
  };

  await redis.set(`user:${email}`, user);
  return NextResponse.json({ ok: true, email, password: "Admin123!" });
}
