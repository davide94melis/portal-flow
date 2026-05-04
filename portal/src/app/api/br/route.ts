import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBR, listBRs, getProject } from "@/lib/manifest";
import { uploadFile } from "@/lib/github";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectSlug = req.nextUrl.searchParams.get("project") || undefined;
  const brs = await listBRs(projectSlug);

  if (session.user.role === "funzionale") {
    return NextResponse.json(brs.filter((br) => br.creato_da === session.user?.email));
  }
  return NextResponse.json(brs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const projectSlug = formData.get("projectSlug") as string;
  const nome = formData.get("nome") as string;
  const codebaseRaw = formData.get("codebase") as string;
  const teamRaw = formData.get("team") as string;

  if (!projectSlug || !nome || !codebaseRaw) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const project = await getProject(projectSlug);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const repo = { owner: project.repoOwner, name: project.repoName, branch: project.branch };
  const codebase = JSON.parse(codebaseRaw);
  const team = teamRaw ? JSON.parse(teamRaw) : [];

  const manifest = await createBR(projectSlug, { nome, creato_da: session.user.email!, codebase, team });

  for (const file of formData.getAll("docs") as File[]) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(repo, `brs/${nome}/docs/${file.name}`, buffer, `[br-portal] ${nome}: upload ${file.name}`);
    manifest.documenti.push({ originale: `docs/${file.name}`, convertito: null, tipo: (formData.get(`tipo_${file.name}`) as string as "br" | "spec" | "mapping" | "mockup" | "altro") || "altro" });
  }

  for (const file of formData.getAll("mockups") as File[]) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(repo, `brs/${nome}/mockups/${file.name}`, buffer, `[br-portal] ${nome}: upload mockup ${file.name}`);
    manifest.documenti.push({ originale: `mockups/${file.name}`, convertito: null, tipo: "mockup" });
  }

  return NextResponse.json(manifest, { status: 201 });
}
