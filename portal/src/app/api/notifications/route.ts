import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotifications, markRead } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json([], { status: 401 });
  const notifs = await getNotifications(session.user.email);
  return NextResponse.json(notifs);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await markRead(session.user.email, id);
  return NextResponse.json({ ok: true });
}
