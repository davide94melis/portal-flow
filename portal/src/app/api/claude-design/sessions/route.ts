import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createDesignSession,
  listDesignSessions,
} from "@/lib/design-sessions";
import type { DesignColors } from "@/types/design-session";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const projectSlug = req.nextUrl.searchParams.get("projectSlug");
  const brName = req.nextUrl.searchParams.get("brName");

  if (!projectSlug || !brName) {
    return NextResponse.json({ error: "Missing projectSlug or brName" }, { status: 400 });
  }

  const sessions = await listDesignSessions(projectSlug, brName);
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { projectSlug, brName, title, colors } = (await req.json()) as {
    projectSlug: string;
    brName: string;
    title: string;
    colors: DesignColors;
  };

  if (!projectSlug || !brName || !title) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const defaultColors: DesignColors = {
    primary: "#3B82F6",
    secondary: "#6B7280",
    background: "#FFFFFF",
    text: "#1F2937",
  };

  const designSession = await createDesignSession(
    projectSlug,
    brName,
    title,
    colors || defaultColors
  );

  return NextResponse.json(designSession, { status: 201 });
}
