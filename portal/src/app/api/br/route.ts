import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBR, listBRs } from "@/lib/manifest";
import { uploadFile } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brs = await listBRs();

  if (session.user.role === "funzionale") {
    const filtered = brs.filter((br) => br.creato_da === session.user?.email);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(brs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const nome = formData.get("nome") as string;
  const codebaseRaw = formData.get("codebase") as string;
  const teamRaw = formData.get("team") as string;

  if (!nome || !codebaseRaw) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const codebase = JSON.parse(codebaseRaw);
  const team = teamRaw ? JSON.parse(teamRaw) : [];

  const manifest = await createBR({
    nome,
    creato_da: session.user.email!,
    codebase,
    team,
  });

  const files = formData.getAll("docs") as File[];
  for (const file of files) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const tipo = (formData.get(`tipo_${file.name}`) as string) || "altro";

    await uploadFile(
      `brs/${nome}/docs/${file.name}`,
      buffer,
      `[br-portal] ${nome}: upload ${file.name}`
    );

    manifest.documenti.push({
      originale: `docs/${file.name}`,
      convertito: null,
      tipo: tipo as "br" | "spec" | "mapping" | "mockup" | "altro",
    });
  }

  const mockups = formData.getAll("mockups") as File[];
  for (const file of mockups) {
    if (file.size === 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(
      `brs/${nome}/mockups/${file.name}`,
      buffer,
      `[br-portal] ${nome}: upload mockup ${file.name}`
    );

    manifest.documenti.push({
      originale: `mockups/${file.name}`,
      convertito: null,
      tipo: "mockup",
    });
  }

  return NextResponse.json(manifest, { status: 201 });
}
