import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Clock, CheckCircle2, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Chip } from "@/components/brand";
import { resources } from "@/lib/data";

export const Route = createFileRoute("/snap")({
  head: () => ({
    meta: [
      { title: "How to apply for food stamps (SNAP / FNS) in NC — PantryHelp" },
      { name: "description", content: "Who may qualify, what documents to gather, how long it takes, and where to apply for Food and Nutrition Services in North Carolina." },
      { property: "og:title", content: "How to apply for food stamps in North Carolina" },
      { property: "og:description", content: "Eligibility, documents, timelines and your county office for NC Food and Nutrition Services (SNAP)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SnapPage,
});

const APPLY = "https://www.ncdhhs.gov/divisions/child-and-family-well-being/food-and-nutrition-services-food-stamps/apply-food-and-nutrition-services-food-stamps";
const FNS = "https://www.ncdhhs.gov/divisions/child-and-family-well-being/food-and-nutrition-services-food-stamps";
const FORM = "https://policies.ncdhhs.gov/wp-content/uploads/DSS-8207-Application-for-Food-and-Nutrition-Services_10.1.2026.pdf";
const RECERT = "https://www.ncdhhs.gov/divisions/child-and-family-well-being/food-and-nutrition-services-food-stamps/online-fns-and-snap-recertifications";
const USDA_EXPEDITED = "https://www.fns.usda.gov/snap/recipient/eligibility";

function Src({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-leaf-deep underline underline-offset-2">
      {children} <ExternalLink className="size-3" />
    </a>
  );
}

function SnapPage() {
  const offices = resources.filter((r) => r.category === "snap-office").sort((a, b) => (a.county ?? "").localeCompare(b.county ?? ""));
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <Chip kind="sourced" />
        <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">How to apply for food stamps in North Carolina</h1>
        <p className="mt-3 max-w-2xl text-lg text-evergreen-80">
          In North Carolina, food stamps (SNAP) are called <b>Food and Nutrition Services (FNS)</b>. Benefits come on an EBT card that works like a debit card at
          stores showing “We accept SNAP”. Everything below is summarized from NC DHHS. Check the linked pages for the latest rules.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <a href="https://epass.nc.gov/" target="_blank" rel="noreferrer" className="rounded-2xl bg-evergreen p-5 text-primary-foreground shadow-lift">
            <div className="text-sm opacity-80">Online</div>
            <div className="mt-1 font-display text-xl font-bold">Apply with ePASS</div>
            <div className="mt-2 text-sm opacity-80">You can apply without making an account.</div>
          </a>
          <a href="#offices" className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="text-sm text-evergreen-60">In person</div>
            <div className="mt-1 font-display text-xl font-bold">Your county DSS office</div>
            <div className="mt-2 text-sm text-evergreen-60">All 100 county offices are listed below.</div>
          </a>
          <a href={FORM} target="_blank" rel="noreferrer" className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="text-sm text-evergreen-60">By mail or fax</div>
            <div className="mt-1 font-display text-xl font-bold">Paper form DSS-8207</div>
            <div className="mt-2 text-sm text-evergreen-60">Print it and send it to your county office.</div>
          </a>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><CheckCircle2 className="size-6 text-leaf" /> Who may qualify</h2>
          <p className="mt-2 text-evergreen-80">
            Eligibility depends on income, household size, assets and other factors. NC DHHS says the calculation is complex, so the best way to find out is to apply.
            You may be able to get benefits if you:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-evergreen-80">
            <li>have no job or a low-paying job</li>
            <li>get Work First (TANF) or SSI</li>
            <li>are elderly or disabled, with low income</li>
            <li>are experiencing homelessness</li>
          </ul>
          <p className="mt-3 rounded-2xl border border-citrus/50 bg-citrus/10 p-4 text-sm text-evergreen">
            <b>2025–2026 changes:</b> a federal law (H.R. 1) expanded work requirements starting December 1, 2025, and changed rules for non-citizens starting February 1, 2026.
            Your county DSS will screen you for these changes.
          </p>
          <div className="mt-2"><Src href={FNS}>NC DHHS: Food and Nutrition Services</Src></div>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><FileText className="size-6 text-leaf" /> Documents to gather</h2>
          <p className="mt-2 text-evergreen-80">Gather what you can easily get, but don’t let missing papers stop you. You can add them after you apply. For each person in the household:</p>
          <ol className="mt-3 list-decimal space-y-1 pl-6 text-evergreen-80">
            <li>ID for the head of household (driver’s license, birth certificate or other government ID)</li>
            <li>Social Security numbers, birthdates and citizenship status</li>
            <li>Money on hand: cash, bank accounts, investments, retirement accounts</li>
            <li>Monthly bills, including childcare, child support and care for a disabled adult</li>
            <li>Medical bills for anyone over 60 or disabled</li>
            <li>Proof of income</li>
            <li>Papers or IDs from other benefits (Medicaid, SSI, Work First)</li>
          </ol>
          <div className="mt-2"><Src href={APPLY}>NC DHHS: How to apply</Src></div>
        </section>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Clock className="size-6 text-leaf" /> Deadlines and timing</h2>
          <ul className="mt-3 space-y-3 text-evergreen-80">
            <li className="rounded-2xl border bg-card p-4"><b>Apply now, even if the form isn’t complete.</b> If you’re approved, benefits count from the day the office gets your application with your name, address and signature.</li>
            <li className="rounded-2xl border bg-card p-4"><b>Interview.</b> A caseworker must interview you or someone you choose.</li>
            <li className="rounded-2xl border bg-card p-4"><b>Up to 30 days</b> to get your EBT card after you apply.</li>
            <li className="rounded-2xl border bg-card p-4"><b>Very low income or no money for food?</b> Federal rules allow faster (“expedited”) service for households in urgent need. Ask your county office. <Src href={USDA_EXPEDITED}>USDA: SNAP eligibility</Src></li>
            <li className="rounded-2xl border bg-card p-4"><b>Renewals:</b> most households must recertify about every 6 months. You can do it online in ePASS. <Src href={RECERT}>NC DHHS: Online recertification</Src></li>
          </ul>
          <p className="mt-3 text-sm text-evergreen-60">Need an interpreter or disability help? Call 866-719-0141 (TTY 711).</p>
        </section>

        <section id="offices" className="mt-12 scroll-mt-24">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><MapPin className="size-6 text-leaf" /> County offices ({offices.length})</h2>
          <p className="mt-2 text-evergreen-80">
            Source: NC DHHS local DSS directory. Or <Link to="/plan" className="font-medium text-leaf-deep underline">see them on the map</Link>.
          </p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {offices.map((o) => (
              <li key={o.id} className="rounded-2xl border bg-card p-4 text-sm">
                <div className="font-medium text-evergreen">{o.county} County</div>
                <div className="text-evergreen-60">{o.address}</div>
                {o.phone ? <a href={`tel:${o.phone}`} className="text-leaf-deep underline">{o.phone}</a> : <span className="text-evergreen-40">Phone unavailable</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
