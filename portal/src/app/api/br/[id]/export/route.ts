import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManifest } from "@/lib/manifest";
import ExcelJS from "exceljs";

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
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "tech_lead" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { projectSlug, brName } = parseId(id);
  const manifest = await getManifest(projectSlug, brName);
  if (!manifest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wb = new ExcelJS.Workbook();

  // ─── Sheet 1: Task ───────────────────────────────────────────────────────────
  const wsTask = wb.addWorksheet("Task");
  wsTask.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Stream", key: "stream", width: 18 },
    { header: "Attivita", key: "attivita", width: 30 },
    { header: "Descrizione", key: "descrizione", width: 60 },
    { header: "Owner", key: "owner", width: 18 },
    { header: "Area", key: "area", width: 8 },
    { header: "Priorita", key: "priorita", width: 10 },
    { header: "Wave", key: "wave", width: 10 },
    { header: "Dipendenze", key: "dipendenze", width: 15 },
    { header: "Effort (gg)", key: "effort_gg", width: 10 },
    { header: "Branch", key: "branch", width: 25 },
    { header: "Progresso", key: "progresso", width: 12 },
    { header: "Stato", key: "stato", width: 15 },
    { header: "Note", key: "note", width: 40 },
  ];

  const headerFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF333333" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  wsTask.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
  });

  for (const t of manifest.piano.task) {
    const row = wsTask.addRow({
      id: t.id,
      stream: t.stream,
      attivita: t.attivita,
      descrizione: t.descrizione,
      owner: t.owner,
      area: t.area,
      priorita: t.priorita,
      wave: t.wave,
      dipendenze: t.dipendenze.join(", "),
      effort_gg: t.effort_gg,
      branch: t.branch ?? "",
      progresso: t.progresso / 100,
      stato: t.stato,
      note: t.note ?? "",
    });

    const progCell = row.getCell("progresso");
    progCell.numFmt = "0%";
    if (t.progresso === 0) {
      progCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } };
    } else if (t.progresso < 50) {
      progCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };
    } else if (t.progresso < 100) {
      progCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFDE7" } };
    } else {
      progCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
    }

    const statoCell = row.getCell("stato");
    if (t.stato === "completata") {
      statoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
      statoCell.font = { color: { argb: "FF1B5E20" } };
    } else if (t.stato === "in_corso") {
      statoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
      statoCell.font = { color: { argb: "FF0D47A1" } };
    } else if (t.stato === "bloccata") {
      statoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } };
      statoCell.font = { color: { argb: "FFB71C1C" } };
    } else if (t.stato === "annullata" || t.stato === "sospesa") {
      statoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
      statoCell.font = { color: { argb: "FF757575" } };
    }

    row.getCell("descrizione").alignment = { wrapText: true };
  }

  wsTask.autoFilter = {
    from: "A1",
    to: `N${manifest.piano.task.length + 1}`,
  };

  // ─── Sheet 2: Per Sviluppatore ───────────────────────────────────────────────
  const wsDev = wb.addWorksheet("Per Sviluppatore");
  wsDev.columns = [
    { header: "Sviluppatore", key: "nome", width: 18 },
    { header: "Ruolo", key: "ruolo", width: 12 },
    { header: "Seniority", key: "seniority", width: 12 },
    { header: "Task totali", key: "totali", width: 12 },
    { header: "Completate", key: "completate", width: 12 },
    { header: "In corso", key: "in_corso", width: 12 },
    { header: "Da iniziare", key: "da_iniziare", width: 12 },
    { header: "Bloccate", key: "bloccate", width: 12 },
    { header: "Progresso medio", key: "progresso_medio", width: 15 },
    { header: "Effort totale", key: "effort_totale", width: 12 },
    { header: "Effort completato", key: "effort_completato", width: 15 },
  ];

  wsDev.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
  });

  const devMap = new Map<string, typeof manifest.piano.task>();
  for (const t of manifest.piano.task) {
    if (!devMap.has(t.owner)) devMap.set(t.owner, []);
    devMap.get(t.owner)!.push(t);
  }

  let totalEffort = 0;
  let totalEffortDone = 0;

  for (const [owner, tasks] of devMap) {
    const member = manifest.team.find((m) => m.nome === owner);
    const completate = tasks.filter((t) => t.stato === "completata").length;
    const in_corso = tasks.filter((t) => t.stato === "in_corso").length;
    const da_iniziare = tasks.filter((t) => t.stato === "da_iniziare").length;
    const bloccate = tasks.filter((t) => t.stato === "bloccata").length;
    const avg =
      tasks.length > 0
        ? tasks.reduce((s, t) => s + t.progresso, 0) / tasks.length / 100
        : 0;
    const effortTotal = tasks.reduce((s, t) => s + t.effort_gg, 0);
    const effortDone = tasks
      .filter((t) => t.stato === "completata")
      .reduce((s, t) => s + t.effort_gg, 0);

    totalEffort += effortTotal;
    totalEffortDone += effortDone;

    const row = wsDev.addRow({
      nome: owner,
      ruolo: member?.ruolo ?? "",
      seniority: member?.seniority ?? "",
      totali: tasks.length,
      completate,
      in_corso,
      da_iniziare,
      bloccate,
      progresso_medio: avg,
      effort_totale: effortTotal,
      effort_completato: effortDone,
    });
    row.getCell("progresso_medio").numFmt = "0%";
  }

  const tasks = manifest.piano.task;

  const totRow = wsDev.addRow({
    nome: "TOTALE",
    totali: tasks.length,
    completate: tasks.filter((t) => t.stato === "completata").length,
    in_corso: tasks.filter((t) => t.stato === "in_corso").length,
    da_iniziare: tasks.filter((t) => t.stato === "da_iniziare").length,
    bloccate: tasks.filter((t) => t.stato === "bloccata").length,
    progresso_medio:
      tasks.length > 0
        ? tasks.reduce((s, t) => s + t.progresso, 0) / tasks.length / 100
        : 0,
    effort_totale: totalEffort,
    effort_completato: totalEffortDone,
  });
  totRow.font = { bold: true };
  totRow.getCell("progresso_medio").numFmt = "0%";

  // ─── Sheet 3: Riepilogo ──────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet("Riepilogo");

  const completed = tasks.filter((t) => t.stato === "completata").length;
  const inProgress = tasks.filter((t) => t.stato === "in_corso").length;
  const notStarted = tasks.filter((t) => t.stato === "da_iniziare").length;
  const blocked = tasks.filter((t) => t.stato === "bloccata").length;
  const cancelled = tasks.filter(
    (t) => t.stato === "annullata" || t.stato === "sospesa"
  ).length;
  const overallPct =
    tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.progresso, 0) / tasks.length)
      : 0;

  const pct = (n: number): string =>
    tasks.length > 0 ? Math.round((n / tasks.length) * 100).toString() : "0";

  const summaryData: (string | number)[][] = [
    ["Progetto", manifest.nome],
    ["Data generazione", new Date().toLocaleDateString("it-IT")],
    [""],
    ["STATO COMPLESSIVO"],
    ["Task totali", tasks.length],
    ["Completate", `${completed} (${pct(completed)}%)`],
    ["In corso", `${inProgress} (${pct(inProgress)}%)`],
    ["Da iniziare", `${notStarted} (${pct(notStarted)}%)`],
    ["Bloccate", `${blocked} (${pct(blocked)}%)`],
    ["Annullate/Sospese", `${cancelled}`],
    [""],
    ["Progresso complessivo", `${overallPct}%`],
    [""],
    ["EFFORT"],
    ["Effort totale stimato", `${totalEffort} gg/uomo`],
    [
      "Effort completato",
      `${totalEffortDone} gg/uomo (${totalEffort > 0 ? Math.round((totalEffortDone / totalEffort) * 100) : 0}%)`,
    ],
    ["Effort rimanente", `${totalEffort - totalEffortDone} gg/uomo`],
  ];

  const waves = [...new Set(tasks.map((t) => t.wave))].sort((a, b) => a - b);
  summaryData.push([""], ["PER WAVE"]);
  for (const w of waves) {
    const waveTasks = tasks.filter((t) => t.wave === w);
    const waveCompleted = waveTasks.filter((t) => t.stato === "completata").length;
    const wavePct =
      waveTasks.length > 0
        ? Math.round((waveCompleted / waveTasks.length) * 100)
        : 0;
    summaryData.push([
      `Wave ${w}`,
      `${wavePct}% completata (${waveCompleted}/${waveTasks.length} task)`,
    ]);
  }

  for (const rowData of summaryData) {
    const r = wsSummary.addRow(rowData);
    const label = rowData[0];
    if (
      typeof label === "string" &&
      label === label.toUpperCase() &&
      label.length > 2
    ) {
      r.font = { bold: true, size: 12 };
    }
  }
  wsSummary.getColumn(1).width = 25;
  wsSummary.getColumn(2).width = 40;

  // ─── Serialize and return ────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `AVANZAMENTO_${manifest.nome}_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
