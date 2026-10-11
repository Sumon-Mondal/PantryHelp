import { useState } from "react";
import { Download, Link2, Save, QrCode, Printer, Copy, X } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlanner } from "@/lib/planner-store";
import { buildReport } from "@/lib/report";
import { Button } from "@/components/ui/button";

export function SaveBar() {
  const { snapshot, snapId, site, plan, evidence, results } = usePlanner();
  const [name, setName] = useState("My pantry plan");
  const [busy, setBusy] = useState(false);

  const [share, setShare] = useState<{ url: string; qr: string } | null>(null);
  const county = evidence.countyName ? `${evidence.countyName} County` : "North Carolina";
  const save = async (quiet = false): Promise<string | null> => {
    setBusy(true);
    const { data, error } = await supabase
      .from("plans")
      .insert({ name: name.slice(0, 120) || "Untitled plan", snapshot: snapshot as never, snapshot_hash: snapId })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error("Couldn't save the plan. Try again.");
      return null;
    }
    const url = `${window.location.origin}/plan?id=${data.id}`;
    window.history.replaceState(null, "", `/plan?id=${data.id}`);
    await navigator.clipboard?.writeText(url).catch(() => {});
    if (!quiet) toast.success("Plan saved. Share link copied.");
    return url;
  };

  const openShare = async () => {
    const url = await save(true);
    if (!url) return;
    const qr = await QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#123B32", light: "#FFFFFF" } });
    setShare({ url, qr });
  };

  const printSheet = () => {
    if (!share) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    w.document.write(`<!doctype html><title>${esc(name)}</title><body style="font-family:system-ui;text-align:center;padding:48px;color:#123B32"><p style="letter-spacing:.1em;text-transform:uppercase;font-size:12px">PantryHelp · ${esc(county)}</p><h1 style="margin:8px 0 24px">${esc(name)}</h1><img src="${share.qr}" width="320" height="320" alt="QR code"/><p style="font-size:14px">Scan to open this plan, or visit</p><p style="font-family:monospace;font-size:13px;word-break:break-all">${esc(share.url)}</p><p style="font-size:11px;color:#4A6B62;margin-top:32px">Plan code ${snapId.slice(0, 8)}</p><script>onload=()=>print()</script></body>`);
    w.document.close();
  };

  const exportPdf = async () => {
    const bytes = await buildReport({ name, snapId, site, plan, evidence, results });
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pantryhelp-${snapId}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex flex-col">
        <span className="px-4 text-[10px] font-semibold uppercase tracking-wider text-evergreen-60">Name this plan</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Franklin St. Tuesday pantry" className="h-11 w-60 rounded-full border bg-card px-4 text-sm" maxLength={120} />
      </label>
      <Button variant="pill" onClick={() => save()} disabled={busy}>
        <Save /> Save & share
      </Button>
      <Button variant="outline" className="rounded-full" onClick={openShare} disabled={busy}>
        <QrCode /> Share link & QR
      </Button>
      <Button variant="outline" className="rounded-full" onClick={exportPdf}>
        <Download /> PDF report
      </Button>
      <span className="hidden items-center gap-1 text-[11px] text-evergreen-60 md:flex" title="A fingerprint of these exact settings. Same settings, same code.">
        <Link2 className="size-3" /> Plan code <span className="font-mono">{snapId.slice(0, 8)}</span>
      </span>
      {share && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-evergreen/30 p-4 backdrop-blur-sm" onClick={() => setShare(null)}>
          <div role="dialog" aria-label="Share this plan" className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between text-left">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-evergreen-60">{county}</p>
                <h3 className="font-display text-xl text-evergreen">{name}</h3>
              </div>
              <button aria-label="Close" onClick={() => setShare(null)} className="rounded-full p-1 text-evergreen-60 hover:bg-muted"><X className="size-4" /></button>
            </div>
            <img src={share.qr} alt="QR code for this plan" className="mx-auto my-4 size-56 rounded-xl border" />
            <p className="break-all rounded-xl bg-muted px-3 py-2 font-mono text-xs text-evergreen">{share.url}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="pill" onClick={() => navigator.clipboard?.writeText(share.url).then(() => toast.success("Link copied"))}><Copy /> Copy link</Button>
              <Button variant="outline" className="rounded-full" onClick={printSheet}><Printer /> Print</Button>
            </div>
            <p className="mt-3 text-[11px] text-evergreen-60">Anyone with this link sees this plan, read-only.</p>
          </div>
        </div>
      )}
    </div>
  );
}
