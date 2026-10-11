import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Chip, type Provenance } from "@/components/brand";
import { sources, resources, DATASET_VERSION, CATEGORY_LABEL, type Category } from "@/lib/data";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "Data sources — PantryHelp" },
      { name: "description", content: "Every dataset PantryHelp uses, with publisher, vintage and a link." },
      { property: "og:title", content: "Data sources — PantryHelp" },
      { property: "og:description", content: "Census, NC DHHS, Cooperative Extension and food bank sources behind PantryHelp." },
    ],
  }),
  component: Sources,
});

function Sources() {
  const counts = resources.reduce<Record<string, number>>((a, r) => ((a[r.category] = (a[r.category] ?? 0) + 1), a), {});
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Sources</h1>
        <p className="mt-3 max-w-2xl text-evergreen-80">
          Every number in PantryHelp traces to one of these files. If a figure wasn't in a file we fetched, it shows as Unavailable — never as zero.
        </p>
        <p className="mt-2 font-mono text-xs text-evergreen-60">dataset {DATASET_VERSION}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {Object.entries(counts).map(([c, n]) => (
            <span key={c} className="rounded-full border bg-card px-3 py-1.5 text-sm">
              {CATEGORY_LABEL[c as Category]}: <b>{n}</b>
            </span>
          ))}
        </div>

        <ol className="mt-8 divide-y rounded-2xl border bg-card">
          {sources.map((s) => (
            <li key={s.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-display text-lg font-bold">{s.title}</h2>
                <Chip kind={(s.label as Provenance) ?? "sourced"} />
              </div>
              <p className="text-sm text-evergreen-80">{s.publisher}</p>
              <p className="mt-1 text-xs text-evergreen-60">
                {s.vintage && <>Vintage {s.vintage} · </>}
                {s.retrievedAt && <>Retrieved {s.retrievedAt.slice(0, 10)}</>}
              </p>
              {s.notes && <p className="mt-2 text-sm text-evergreen-80">{s.notes}</p>}
              {s.url && (
                <a href={s.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-sm text-leaf-deep underline-offset-4 hover:underline">
                  {s.url.length > 90 ? s.url.slice(0, 90) + "…" : s.url} <ExternalLink className="size-3 shrink-0" />
                </a>
              )}
            </li>
          ))}
        </ol>
        <section className="mt-10 rounded-2xl bg-paper-deep p-6 text-sm text-evergreen-80">
          <h2 className="font-display text-lg font-bold text-evergreen">Limits</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>The ring is a straight-line distance, not travel time.</li>
            <li>Visits are not unique households. People in a radius are not measured demand.</li>
            <li>Capacity, weekly pounds and volunteer counts of listed sites are unavailable.</li>
            <li>Outside Chapel Hill, population in a ring uses county-average density.</li>
            <li>Statewide lists are still growing; a missing county office means it wasn't parsed yet, not that none exists.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
