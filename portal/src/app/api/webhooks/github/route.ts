import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { getManifest } from "@/lib/manifest";

export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event");
  if (event !== "push") return NextResponse.json({ ok: true });

  const payload = await req.json();
  const commits = payload.commits || [];

  for (const commit of commits) {
    const msg: string = commit.message || "";
    const match = msg.match(/\[br-(?:pipeline|portal)\] ([^:]+): (.+)/);
    if (!match) continue;

    const brName = match[1];
    const action = match[2];
    const manifest = await getManifest(brName);
    if (!manifest) continue;

    if (action.includes("review completato")) {
      await createNotification(manifest.creato_da, `Review completato per ${brName}`, brName, "review");
    }
    if (action.includes("stato →")) {
      for (const member of manifest.team) {
        await createNotification(member.email, `${brName}: ${action}`, brName, "execute");
      }
    }
  }

  return NextResponse.json({ ok: true });
}
