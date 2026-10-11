import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleDashed, Calculator, FlaskConical, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-evergreen" />
      <path d="M9 27V12a7 7 0 0 1 14 0v15" fill="none" className="stroke-paper" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 24c-4-2-4-8 0-11 4 3 4 9 0 11z" className="fill-leaf" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)} aria-label="PantryHelp home">
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">
        <span className="text-evergreen">Pantry</span>
        <span className="text-leaf-deep">Help</span>
      </span>
    </Link>
  );
}

export type Provenance = "sourced" | "estimated" | "assumed" | "simulated" | "unavailable";

const P: Record<Provenance, { cls: string; Icon: typeof CheckCircle2; word: string }> = {
  sourced: { cls: "bg-aqua-tint text-aqua-deep border-transparent", Icon: CheckCircle2, word: "Sourced" },
  estimated: { cls: "bg-sky-tint text-sky-deep border-transparent", Icon: Calculator, word: "Estimated" },
  assumed: { cls: "bg-citrus-tint text-citrus-deep border-transparent", Icon: HelpCircle, word: "Assumed" },
  simulated: { cls: "bg-leaf-tint text-leaf-deep border-transparent", Icon: FlaskConical, word: "Simulated" },
  unavailable: { cls: "bg-transparent text-evergreen-60 border-dashed border-evergreen-40", Icon: CircleDashed, word: "Unavailable" },
};

export function Chip({ kind, className }: { kind: Provenance; className?: string }) {
  const { cls, Icon, word } = P[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", cls, className)}>
      <Icon className="size-3" aria-hidden />
      {word}
    </span>
  );
}

export function Stat({
  label,
  value,
  kind,
  note,
}: {
  label: string;
  value: string | null;
  kind: Provenance;
  note?: string;
}) {
  const k = value == null ? "unavailable" : kind;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-evergreen-80">{label}</span>
        <Chip kind={k} />
      </div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums text-evergreen">{value ?? "Unavailable"}</div>
      {note && <p className="mt-1 text-xs text-evergreen-60">{note}</p>}
    </div>
  );
}

export const fmt = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? null : n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export const pct = (n: number | null | undefined, d = 1) => (n == null ? null : `${(n * 100).toFixed(d)}%`);
export const usd = (n: number | null | undefined) => (n == null ? null : `$${Math.round(n).toLocaleString("en-US")}`);
