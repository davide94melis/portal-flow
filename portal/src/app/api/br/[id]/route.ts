import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManifest, updateManifest } from "@/lib/manifest";

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
  const manifest = await getManifest(projectSlug, brName);
  if (!manifest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(manifest);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { projectSlug, brName } = parseId(id);
  const body = await req.json();
  const { action, data } = body as { action: string; data: Record<string, unknown> };

  const updated = await updateManifest(projectSlug, brName, (m) => {
    switch (action) {
      case "respond_problem": {
        const { problemId, risposta } = data as { problemId: string; risposta: string };
        const p = m.review.problemi.find((x) => x.id === problemId);
        if (p) { p.risposta = risposta; p.data_risposta = new Date().toISOString(); p.stato = "risposto"; }
        if (m.stato_pipeline === "review") m.stato_pipeline = "clarify";
        break;
      }
      case "respond_assumption": {
        const { assumptionId, risposta } = data as { assumptionId: string; risposta: string };
        const a = m.review.assunzioni.find((x) => x.id === assumptionId);
        if (a) a.risposta_funzionale = risposta;
        break;
      }
      case "approve_plan": {
        m.piano.approvato = true;
        m.piano.data_approvazione = new Date().toISOString();
        m.piano.approvato_da = session.user?.email || null;
        m.stato_pipeline = "approve";
        break;
      }
      case "qa_validate": {
        const { criterioId, risultato } = data as { criterioId: string; risultato: "pass" | "fail" };
        const c = m.qa.criteri_accettazione.find((x) => x.id === criterioId);
        if (c) { c.validato_qa = true; c.risultato_test = risultato; }
        break;
      }
      case "update_codebase": {
        const role = session.user?.role;
        if (role !== "tech_lead" && role !== "admin") break;
        const { codebase } = data as { codebase: { nome: string; sigla: string }[] };
        m.codebase = codebase;
        break;
      }
    }
    m.timeline.push({
      data: new Date().toISOString(),
      attore: session.user?.email || "unknown",
      ruolo: session.user?.role === "tech_lead" ? "tech_lead" : session.user?.role || "sistema",
      azione: action.replace(/_/g, " "),
      stage: m.stato_pipeline,
    });
    return m;
  }, action.replace(/_/g, " "));

  return NextResponse.json(updated);
}
