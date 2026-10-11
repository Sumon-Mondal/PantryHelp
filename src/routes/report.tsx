import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { countyRows, buildCountyReport } from "@/lib/county-report";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "North Carolina county report — PantryHelp" },
      { name: "description", content: "Population, poverty, car ownership and food help places for all 100 North Carolina counties, downloadable as a PDF." },
      { property: "og:title", content: "North Carolina county report — PantryHelp" },
      { property: "og:description", content: "All 100 NC counties: Census population and poverty plus food help places, as a table and PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

type Key = "name" | "population" | "povertyRate" | "noCarRate" | "places" | "per10k";
const pct = (v: number | null) => (v == null ? "Unavailable" : `${(v * 100).toFixed(1)}%`);

function ReportPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => {
    const f = countyRows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
    return [...f].sort((a, b) => {
      const x = a[sort.k], y = b[sort.k];
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [q, sort]);

  async function download() {
    setBusy(true);
    try {
      const bytes = await buildCountyReport(rows);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "pantryhelp-nc-county-report.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setBusy(false);
    }
  }

  const Th = ({ k, children, right }: { k: Key; children: string; right?: boolean }) => (
    <th className={"px-3 py-2 font-semibold " + (right ? "text-right" : "text-left")}>
      <button type="button" className="hover:underline" onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === "name" ? 1 : -1 }))}>
        {children}
        {sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">North Carolina county report</h1>
            <p className="text-sm text-evergreen-60">All 100 counties. Census ACS 2019–2023 numbers and the food help places on our map.</p>
          </div>
          <Button onClick={download} disabled={busy}>
            <Download /> {busy ? "Making PDF…" : "Download PDF"}
          </Button>
        </div>
        <label className="flex h-11 items-center gap-2 rounded-full border bg-card px-4 shadow-soft">
          <Search className="size-4 text-evergreen-60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a county" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm text-evergreen">
            <thead className="bg-leaf/15">
              <tr>
                <Th k="name">County</Th>
                <Th k="population" right>People</Th>
                <Th k="povertyRate" right>Poverty</Th>
                <Th k="noCarRate" right>No car</Th>
                <Th k="places" right>Food places</Th>
                <Th k="per10k" right>Per 10,000</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.geoid} className="border-t">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.population == null ? "Unavailable" : r.population.toLocaleString("en-US")}</td>
                  <td className="px-3 py-2 text-right font-mono">{pct(r.povertyRate)}</td>
                  <td className="px-3 py-2 text-right font-mono">{pct(r.noCarRate)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.places}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.per10k == null ? "Unavailable" : r.per10k.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-evergreen-60">Food place counts include only the places in our sources, so real totals may be higher. "No car" is the share of households without a vehicle.</p>
      </main>
    </div>
  );
}
