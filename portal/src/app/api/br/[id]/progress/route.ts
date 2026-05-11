import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAggregatedProgress } from "@/lib/manifest";

function parseId(id: string): { projectSlug: string; brName: string } {
  const sep = id.indexOf("--");
  if (sep === -1) return { projectSlug: "", brName: id };
  return { projectSlug: id.slice(0, sep), brName: id.slice(sep + 2) };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { projectSlug, brName } = parseId(id);
  const progress = await getAggregatedProgress(projectSlug, brName);
  if (!progress) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const completed = progress.filter((t) => t.stato === "completata").length;
  const inProgress = progress.filter((t) => t.stato === "in_corso").length;
  const total = progress.length;
  const overallPercent =
    total > 0
      ? Math.round(progress.reduce((sum, t) => sum + t.progresso, 0) / total)
      : 0;

  return NextResponse.json({
    tasks: progress,
    summary: { total, completed, inProgress, overallPercent },
  });
}
