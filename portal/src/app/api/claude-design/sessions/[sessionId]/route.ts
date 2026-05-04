import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDesignSession,
  updateDesignSession,
  deleteDesignSession,
} from "@/lib/design-sessions";

function parseQuery(req: NextRequest) {
  const projectSlug = req.nextUrl.searchParams.get("projectSlug");
  const brName = req.nextUrl.searchParams.get("brName");
  return { projectSlug, brName };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;
  const { projectSlug, brName } = parseQuery(req);
  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  const designSession = await getDesignSession(projectSlug, brName, sessionId);
  if (!designSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(designSession);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;
  const { projectSlug, brName, ...updates } = await req.json();
  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  const updated = await updateDesignSession(projectSlug, brName, sessionId, updates);
  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;
  const { projectSlug, brName } = parseQuery(req);
  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  await deleteDesignSession(projectSlug, brName, sessionId);
  return NextResponse.json({ ok: true });
}
