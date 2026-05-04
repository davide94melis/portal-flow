import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDesignSession, updateDesignSession } from "@/lib/design-sessions";
import { getProject, updateManifest } from "@/lib/manifest";
import { uploadFile } from "@/lib/github";
import { renderHtmlToPng } from "@/lib/renderer";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "funzionale") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId, projectSlug, brName } = (await req.json()) as {
    sessionId: string;
    projectSlug: string;
    brName: string;
  };

  const designSession = await getDesignSession(projectSlug, brName, sessionId);
  if (!designSession || !designSession.currentHtml) {
    return NextResponse.json(
      { error: "Session not found or no HTML to render" },
      { status: 404 }
    );
  }

  const project = await getProject(projectSlug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const pngBuffer = await renderHtmlToPng(designSession.currentHtml);

  const slug = slugify(designSession.title);
  const pngPath = `brs/${brName}/mockups/${slug}.png`;

  const repo = {
    owner: project.repoOwner,
    name: project.repoName,
    branch: project.branch,
  };

  await uploadFile(
    repo,
    pngPath,
    pngBuffer,
    `[br-portal] ${brName}: mockup ${designSession.title}`
  );

  await updateManifest(projectSlug, brName, (m) => {
    const existing = m.documenti.findIndex(
      (d) => d.originale === `mockups/${slug}.png`
    );
    if (existing === -1) {
      m.documenti.push({
        originale: `mockups/${slug}.png`,
        convertito: null,
        tipo: "mockup",
      });
    }
    return m;
  }, `mockup ${designSession.title} saved`);

  await updateDesignSession(projectSlug, brName, sessionId, {
    savedAsPng: true,
    pngPath,
  });

  return NextResponse.json({ pngPath, success: true });
}
