import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listProjects, createProject, deleteProject } from "@/lib/manifest";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });
  return NextResponse.json(await listProjects());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { nome, slug, repoOwner, repoName, branch } = await req.json();
  if (!nome || !slug || !repoOwner || !repoName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const project = await createProject({ nome, slug, repoOwner, repoName, branch: branch || "main" });
  return NextResponse.json(project, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { slug } = await req.json();
  await deleteProject(slug);
  return NextResponse.json({ ok: true });
}
