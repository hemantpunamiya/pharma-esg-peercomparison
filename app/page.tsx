"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
  CartesianGrid,
  LabelList,
} from "recharts";
import EmailGateModal from "@/components/EmailGateModal";
import data from "@/public/data/pharma_esg_data.json";

interface Company {
  company_name: string;
  tier: string;
  total_ghg_cy?: number;
  total_ghg_py?: number;
  renewable_share_pct?: number;
  female_pct?: number;
  waste_generated_cy?: number;
  water_consumption_cy?: number;
  renewable_energy_cy?: number;
  nonrenewable_energy_cy?: number;
  revenue_cy?: number;
  total_employees_cy?: number;
  ghg_intensity_cy?: number;
  [key: string]: unknown;
}

const companies: Company[] = (data as { companies: Company[] }).companies;
const summary = (data as { summary: Record<string, number> }).summary;

const TIER_COLORS: Record<string, string> = {
  ">50K Cr": "#1b2a4a",
  "20-50K Cr": "#4a90d9",
  "<20K Cr": "#7ec8e3",
};
const TIER_LABELS: Record<string, string> = {
  ">50K Cr": "Large Cap",
  "20-50K Cr": "Mid Cap",
  "<20K Cr": "Small Cap",
};

const pct = (v?: number) =>
  v !== undefined && v !== null ? `${v.toFixed(1)}%` : "—";

function shortName(name: string, max = 20) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

function topN(key: string, n: number, asc: boolean) {
  return [...companies]
    .filter((c) => c[key] !== undefined && c[key] !== null && (c[key] as number) > 0)
    .sort((a, b) =>
      asc
        ? (a[key] as number) - (b[key] as number)
        : (b[key] as number) - (a[key] as number)
    )
    .slice(0, n);
}

// ── Pre-computed chart data ──────────────────────────────────────
const tierDist = [">50K Cr", "20-50K Cr", "<20K Cr"].map((t) => ({
  name: TIER_LABELS[t],
  value: companies.filter((c) => c.tier === t).length,
  color: TIER_COLORS[t],
}));

const reTop15 = topN("renewable_share_pct", 15, false).map((c) => ({
  name: shortName(c.company_name, 22),
  value: Math.round((c.renewable_share_pct as number) * 10) / 10,
  tier: c.tier,
}));

const ghgTop10 = topN("total_ghg_cy", 10, false).map((c) => ({
  name: shortName(c.company_name, 22),
  value: Math.round(c.total_ghg_cy! / 1000),
  tier: c.tier,
}));

const ghgYoY = companies
  .filter((c) => c.total_ghg_cy && c.total_ghg_py && (c.total_ghg_py as number) > 0)
  .map((c) => ({
    name: shortName(c.company_name, 20),
    value: Math.round(((c.total_ghg_cy! - c.total_ghg_py!) / c.total_ghg_py!) * 1000) / 10,
    tier: c.tier,
  }))
  .sort((a, b) => a.value - b.value);

const ghgBestReducers = ghgYoY.slice(0, 10);
const ghgWorstGrowers = [...ghgYoY].sort((a, b) => b.value - a.value).slice(0, 10);

const femaleTop15 = topN("female_pct", 15, false).map((c) => ({
  name: shortName(c.company_name, 22),
  value: Math.round((c.female_pct as number) * 10) / 10,
  tier: c.tier,
}));

const waterTop15 = topN("water_consumption_cy", 15, false).map((c) => ({
  name: shortName(c.company_name, 22),
  value: Math.round(c.water_consumption_cy! / 1000),
  tier: c.tier,
}));

const avgFemaleByTier = [">50K Cr", "20-50K Cr", "<20K Cr"].map((t) => {
  const cos = companies.filter((c) => c.tier === t && c.female_pct !== undefined);
  const avg = cos.reduce((s, c) => s + (c.female_pct as number || 0), 0) / cos.length;
  return { name: TIER_LABELS[t], value: Math.round(avg * 10) / 10, color: TIER_COLORS[t] };
});

// Revenue vs GHG scatter
const revenueGhgScatter = companies
  .filter((c) => c.revenue_cy && c.revenue_cy > 0 && c.total_ghg_cy && c.total_ghg_cy > 0)
  .map((c) => ({
    x: Math.round(c.revenue_cy! / 100) / 10, // '000 Cr
    y: Math.round(c.total_ghg_cy! / 1000), // K tCO2e
    name: shortName(c.company_name, 22),
    tier: c.tier,
  }));

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [capFilter, setCapFilter] = useState<">50K Cr" | "20-50K Cr" | "<20K Cr" | "all">("all");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      if (localStorage.getItem("esg_email_captured")) setUnlocked(true);
    }
  }, []);

  const handleUnlock = useCallback(() => setUnlocked(true), []);

  // Filter companies based on cap selection
  const getFilteredCompanies = useCallback((tier?: ">50K Cr" | "20-50K Cr" | "<20K Cr") => {
    let filtered = capFilter === "all" ? companies : companies.filter((c) => c.tier === capFilter);
    if (tier) filtered = filtered.filter((c) => c.tier === tier);
    return filtered;
  }, [capFilter]);

  // Generate energy mix data based on filter
  const getEnergyMixByTier = useCallback(() => {
    if (capFilter === "all") {
      return [">50K Cr", "20-50K Cr", "<20K Cr"].map((t) => {
        const cos = companies.filter((c) => c.tier === t && (c.renewable_energy_cy !== undefined || c.nonrenewable_energy_cy !== undefined));
        const re = cos.reduce((s, c) => s + (c.renewable_energy_cy as number || 0), 0);
        const nre = cos.reduce((s, c) => s + (c.nonrenewable_energy_cy as number || 0), 0);
        const total = re + nre;
        const renewablePct = total > 0 ? (re / total) * 100 : 0;
        return {
          name: TIER_LABELS[t],
          Renewable: Math.round(renewablePct),
          NonRenewable: Math.round(100 - renewablePct),
        };
      });
    } else {
      const cos = companies.filter((c) => c.tier === capFilter && (c.renewable_energy_cy !== undefined || c.nonrenewable_energy_cy !== undefined));
      const re = cos.reduce((s, c) => s + (c.renewable_energy_cy as number || 0), 0);
      const nre = cos.reduce((s, c) => s + (c.nonrenewable_energy_cy as number || 0), 0);
      const total = re + nre;
      const renewablePct = total > 0 ? (re / total) * 100 : 0;
      return [{
        name: TIER_LABELS[capFilter],
        Renewable: Math.round(renewablePct),
        NonRenewable: Math.round(100 - renewablePct),
      }];
    }
  }, [capFilter]);

  return (
    <>
      {!unlocked && <EmailGateModal onUnlock={handleUnlock} />}

      <div className={!unlocked ? "pointer-events-none select-none blur-sm" : ""}>

        {/* ── HERO ── */}
        <header className="bg-gradient-to-br from-[#1b2a4a] via-[#2c3e6b] to-[#1b2a4a] text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#4a90d9]">
              AccelentPartners
            </p>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-5xl">
              Indian Pharma ESG Deep Dive
            </h1>
            <p className="mb-2 text-lg text-slate-300 md:text-xl">
              Peer Rankings &amp; Analytics Across Key ESG Dimensions
            </p>
            <p className="text-sm text-slate-400">
              We analysed 56 pharma BRSRs so you don&apos;t have to.
            </p>
          </div>
        </header>

        {/* ── STATS BAR ── */}
        <section className="relative z-10 -mt-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
            {[
              ["56", "Companies Analysed"],
              ["501", "Data Points Each"],
              [`${Math.round(summary.total_revenue_cr / 1000)}K Cr`, "Combined Revenue"],
              [`${(summary.total_employees / 1000).toFixed(0)}K`, "Total Workforce"],
            ].map(([val, label]) => (
              <div key={label} className="rounded-xl bg-white px-5 py-4 text-center shadow-lg">
                <div className="text-2xl font-extrabold text-[#1b2a4a]">{val}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CAP SIZE FILTER ── */}
        <section className="bg-white py-6">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700">Filter by Market Cap:</label>
              <select
                value={capFilter}
                onChange={(e) => setCapFilter(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4a90d9] focus:ring-offset-1"
              >
                <option value="all">All Companies</option>
                <option value=">50K Cr">Large Cap (&gt;₹50K Cr)</option>
                <option value="20-50K Cr">Mid Cap (₹20-50K Cr)</option>
                <option value="<20K Cr">Small Cap (&lt;₹20K Cr)</option>
              </select>
            </div>
          </div>
        </section>

        {mounted && <>
        {/* ── UNIVERSE OVERVIEW ── */}
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader title="Universe Overview" subtitle="Composition of the 56-company pharma cohort by market cap tier" />

            <div className="grid gap-8 md:grid-cols-2">
              {/* Tier donut */}
              <ChartCard title="Companies by Market Cap Tier">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={tierDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {tierDist.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} companies`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex justify-center gap-6 text-xs text-slate-500">
                  {tierDist.map((t) => (
                    <span key={t.name} className="flex items-center gap-1">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                      {t.name}: {t.value}
                    </span>
                  ))}
                </div>
              </ChartCard>

              {/* Avg female by tier */}
              <ChartCard title="Avg Female Employee % by Tier">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={avgFemaleByTier} layout="vertical" margin={{ left: 10, right: 40 }}>
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 15]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Avg Female %"]} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {avgFemaleByTier.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </section>

        {/* ── CARBON ── */}
        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader title="Carbon Emissions" subtitle="Scope 1 + Scope 2 GHG data from FY 2024-25 BRSR filings" />

            <div className="grid gap-8 md:grid-cols-2">
              {/* Top 10 emitters */}
              <ChartCard title="Top 10 Carbon Emitters (K tCO₂e)" accent="red">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ghgTop10} layout="vertical" margin={{ left: 10, right: 50 }}>
                    <XAxis type="number" tickFormatter={(v) => `${v}K`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [v != null ? `${Number(v).toLocaleString("en-IN")}K tCO₂e` : "—"]} />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}K`} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* GHG YoY — best reducers */}
              <ChartCard title="Best GHG Reducers YoY (%)" accent="green">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ghgBestReducers} layout="vertical" margin={{ left: 10, right: 60 }}>
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "GHG Change YoY"]} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* GHG YoY — worst growers */}
              <ChartCard title="Highest GHG Increase YoY (%)" accent="red">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ghgWorstGrowers} layout="vertical" margin={{ left: 10, right: 60 }}>
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "GHG Change YoY"]} />
                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Revenue vs GHG scatter */}
              <ChartCard title="Revenue vs Total GHG (Scatter)" subtitle="Revenue in ₹000 Cr · GHG in K tCO₂e">
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" dataKey="x" name="Revenue" tickFormatter={(v) => `₹${v}K Cr`} tick={{ fontSize: 10 }} label={{ value: "Revenue (₹000 Cr)", position: "insideBottom", offset: -5, fontSize: 10 }} />
                    <YAxis type="number" dataKey="y" name="GHG" tickFormatter={(v) => `${v}K`} tick={{ fontSize: 10 }} label={{ value: "GHG (K tCO₂e)", angle: -90, position: "insideLeft", fontSize: 10 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded bg-white px-3 py-2 text-xs shadow-lg border border-slate-200">
                            <p className="font-bold text-slate-800">{d.name}</p>
                            <p className="text-slate-500">Revenue: ₹{d.x}K Cr</p>
                            <p className="text-slate-500">GHG: {d.y}K tCO₂e</p>
                          </div>
                        );
                      }}
                    />
                    {[">50K Cr", "20-50K Cr", "<20K Cr"].map((tier) => (
                      <Scatter
                        key={tier}
                        name={TIER_LABELS[tier]}
                        data={revenueGhgScatter.filter((d) => d.tier === tier)}
                        fill={TIER_COLORS[tier]}
                        opacity={0.8}
                      />
                    ))}
                    <Legend formatter={(v) => TIER_LABELS[v] ?? v} />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </section>

        {/* ── ENERGY ── */}
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader title="Renewable Energy" subtitle="Share of renewable in total energy consumption" />

            <div className="grid gap-8 md:grid-cols-2">
              {/* Top 15 RE companies */}
              <ChartCard title="Top 15 by Renewable Energy Share (%)" accent="green">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={reTop15} layout="vertical" margin={{ left: 10, right: 50 }}>
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Renewable Share"]} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Energy mix by tier */}
              <ChartCard title={capFilter === "all" ? "Energy Mix by Tier (% Renewable vs Non-Renewable)" : `Energy Mix - ${TIER_LABELS[capFilter as keyof typeof TIER_LABELS]} (% Renewable vs Non-Renewable)`}>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={getEnergyMixByTier()} margin={{ left: 0, right: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip formatter={(v, name) => [`${v}%`, String(name)]} />
                    <Legend />
                    <Bar dataKey="Renewable" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Renewable" />
                    <Bar dataKey="NonRenewable" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Non-Renewable" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </section>

        {/* ── SOCIAL ── */}
        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader title="Social — Workforce & Gender" subtitle="Employee count and gender diversity from BRSR filings" />

            <div className="grid gap-8 md:grid-cols-2">
              {/* Top female % companies */}
              <ChartCard title="Top 15 by Female Employee % " accent="blue">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={femaleTop15} layout="vertical" margin={{ left: 10, right: 50 }}>
                    <XAxis type="number" domain={[0, 30]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Female Employees"]} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Top water consumers */}
              <ChartCard title="Top 15 Water Consumers (KL '000)" accent="blue">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={waterTop15} layout="vertical" margin={{ left: 10, right: 50 }}>
                    <XAxis type="number" tickFormatter={(v) => `${v}K`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [v != null ? `${Number(v).toLocaleString("en-IN")}K KL` : "—"]} />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v) => `${v}K`} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </section>

        {/* ── ESG RANKINGS ── */}
        <section className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeader title="ESG Rankings" subtitle="Top & Bottom performers across key ESG dimensions" />

            <div className="grid gap-8 md:grid-cols-2">
              <RankingTable
                title="Lowest Carbon Emitters"
                items={topN("total_ghg_cy", 10, true).map((c) => ({
                  name: c.company_name,
                  tier: c.tier,
                  value: `${Math.round(c.total_ghg_cy!).toLocaleString("en-IN")} tCO₂e`,
                }))}
                accent="green"
              />
              <RankingTable
                title="Highest Carbon Emitters"
                items={topN("total_ghg_cy", 10, false).map((c) => ({
                  name: c.company_name,
                  tier: c.tier,
                  value: `${Math.round(c.total_ghg_cy!).toLocaleString("en-IN")} tCO₂e`,
                }))}
                accent="red"
              />
              <RankingTable
                title="Best Renewable Energy Share"
                items={topN("renewable_share_pct", 10, false).map((c) => ({
                  name: c.company_name,
                  tier: c.tier,
                  value: pct(c.renewable_share_pct as number),
                }))}
                accent="green"
              />
              <RankingTable
                title="Highest Female Employee %"
                items={topN("female_pct", 10, false).map((c) => ({
                  name: c.company_name,
                  tier: c.tier,
                  value: pct(c.female_pct as number),
                }))}
                accent="blue"
              />
              <RankingTable
                title="Highest Water Consumption (KL)"
                items={topN("water_consumption_cy", 10, false).map((c) => ({
                  name: c.company_name,
                  tier: c.tier,
                  value: `${Math.round(c.water_consumption_cy!).toLocaleString("en-IN")} KL`,
                }))}
                accent="blue"
              />
              <RankingTable
                title="Highest Waste Generated (MT)"
                items={topN("waste_generated_cy", 10, false).map((c) => ({
                  name: c.company_name,
                  tier: c.tier,
                  value: `${Math.round(c.waste_generated_cy!).toLocaleString("en-IN")} MT`,
                }))}
                accent="amber"
              />
            </div>
          </div>
        </section>

        </>}

        {/* ── FOOTER ── */}
        <footer className="border-t border-slate-200 bg-white py-8">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <p className="text-sm font-semibold text-[#1b2a4a]">AccelentPartners</p>
            <p className="mt-1 text-xs text-slate-500">
              BRSR Strategy &middot; ESG Analytics &middot; Assurance Readiness
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Data sourced from publicly available BRSR filings (FY 2024-25). This report is for informational purposes only.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-bold text-[#1b2a4a]">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const accentBar: Record<string, string> = {
    green: "bg-emerald-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 ${accentBar[accent ?? ""] ?? "bg-[#1b2a4a]"}`} />
      <div className="p-5">
        <p className="mb-0.5 text-sm font-bold text-slate-800">{title}</p>
        {subtitle && <p className="mb-3 text-xs text-slate-400">{subtitle}</p>}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function RankingTable({
  title,
  items,
  accent,
}: {
  title: string;
  items: { name: string; tier: string; value: string }[];
  accent: string;
}) {
  const headerColors: Record<string, string> = {
    green: "bg-emerald-600",
    red: "bg-red-600",
    blue: "bg-blue-600",
    amber: "bg-amber-500",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div className={`px-4 py-2.5 text-sm font-bold text-white ${headerColors[accent] ?? "bg-slate-600"}`}>
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((item, i) => (
            <tr key={item.name} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="w-8 px-3 py-2 text-xs font-bold text-slate-400">{i + 1}</td>
              <td className="py-2 font-medium text-slate-800">
                {item.name}
                <span className="ml-2 text-xs text-slate-400">{item.tier}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-slate-700">
                {item.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
