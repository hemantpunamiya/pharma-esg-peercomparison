"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, CartesianGrid,
  LabelList,
} from "recharts";
import data from "@/public/data/amc_esg_data.json";

interface Company {
  company_name: string;
  tier: string;
  scope1_cy?: number;
  scope2_cy?: number;
  scope3_cy?: number;
  total_ghg_cy?: number;
  scope3_pct_of_total?: number;
  scope3_intensity_cy?: number;
  ghg_intensity_cy?: number;
  revenue_cy?: number;
  female_pct?: number;
  total_employees_cy?: number;
  renewable_share_pct?: number;
  renewable_energy_cy?: number;
  nonrenewable_energy_cy?: number;
  csr_spend_cy?: number;
  scope3_applicable?: string;
  scope3_assured?: string;
  [key: string]: unknown;
}

const companies: Company[] = (data as { companies: Company[] }).companies;
const summary = (data as { summary: Record<string, number> }).summary;

const TIER_COLORS: Record<string, string> = {
  "Large Cap": "#1b2a4a",
  "Mid Cap":   "#4a90d9",
  "Small Cap": "#7ec8e3",
};

function shortName(name: string, max = 24) {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

function topN(key: string, n: number, asc: boolean, filter?: string) {
  let src = companies.filter((c) => c[key] !== undefined && c[key] !== null && (c[key] as number) > 0);
  if (filter && filter !== "all") src = src.filter((c) => c.tier === filter);
  return src
    .sort((a, b) => asc ? (a[key] as number) - (b[key] as number) : (b[key] as number) - (a[key] as number))
    .slice(0, n);
}

const pct = (v?: number) => v !== undefined && v !== null ? `${v.toFixed(1)}%` : "—";

// Scope 3 vs Scope 1+2 scatter
const scopeScatter = companies
  .filter((c) => c.total_ghg_cy && c.total_ghg_cy > 0 && c.scope3_cy && c.scope3_cy > 0)
  .map((c) => ({
    x: Math.round(c.total_ghg_cy!),
    y: Math.round(c.scope3_cy!),
    name: shortName(c.company_name, 28),
    tier: c.tier,
  }));

// Scope breakdown stacked for companies that report all 3
const scopeBreakdown = companies
  .filter((c) => c.scope3_cy && c.scope3_cy > 0 && (c.scope1_cy || c.scope2_cy))
  .sort((a, b) => {
    const ta = (a.scope1_cy || 0) + (a.scope2_cy || 0) + (a.scope3_cy || 0);
    const tb = (b.scope1_cy || 0) + (b.scope2_cy || 0) + (b.scope3_cy || 0);
    return tb - ta;
  })
  .slice(0, 15)
  .map((c) => ({
    name: shortName(c.company_name, 20),
    Scope1: Math.round(c.scope1_cy || 0),
    Scope2: Math.round(c.scope2_cy || 0),
    Scope3: Math.round(c.scope3_cy || 0),
    tier: c.tier,
  }));

// Tier distribution
const tierDist = ["Large Cap", "Mid Cap", "Small Cap"].map((t) => ({
  name: t,
  value: companies.filter((c) => c.tier === t).length,
  color: TIER_COLORS[t],
}));

// Scope 3 reporting adoption by tier
const scope3Adoption = ["Large Cap", "Mid Cap", "Small Cap"].map((t) => {
  const all = companies.filter((c) => c.tier === t);
  const reporters = all.filter((c) => c.scope3_cy !== undefined && c.scope3_cy !== null);
  return {
    name: t,
    Reporting: reporters.length,
    "Not Reporting": all.length - reporters.length,
  };
});

// Avg female % by tier
const femaleByTier = ["Large Cap", "Mid Cap", "Small Cap"].map((t) => {
  const cos = companies.filter((c) => c.tier === t && c.female_pct !== undefined);
  const avg = cos.length ? cos.reduce((s, c) => s + (c.female_pct as number), 0) / cos.length : 0;
  return { name: t, value: Math.round(avg * 10) / 10, color: TIER_COLORS[t] };
});

// GHG intensity by revenue for reporters
const ghgIntensity = companies
  .filter((c) => c.total_ghg_cy && c.total_ghg_cy > 0 && c.revenue_cy && c.revenue_cy > 0)
  .map((c) => ({
    name: shortName(c.company_name, 20),
    value: Math.round((c.total_ghg_cy! / c.revenue_cy!) * 1000) / 1000,
    tier: c.tier,
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 12);

export default function AMCPage() {
  const [mounted, setMounted] = useState(false);
  const [capFilter, setCapFilter] = useState<"all" | "Large Cap" | "Mid Cap" | "Small Cap">("all");

  useEffect(() => { setMounted(true); }, []);

  const filteredCompanies = useCallback(() => {
    return capFilter === "all" ? companies : companies.filter((c) => c.tier === capFilter);
  }, [capFilter]);

  const scope3Top = useCallback(() => {
    return topN("scope3_cy", 15, false, capFilter).map((c) => ({
      name: shortName(c.company_name, 22),
      value: Math.round(c.scope3_cy!),
      tier: c.tier,
    }));
  }, [capFilter]);

  const ghgTop = useCallback(() => {
    return topN("total_ghg_cy", 12, false, capFilter).map((c) => ({
      name: shortName(c.company_name, 22),
      value: Math.round(c.total_ghg_cy!),
      tier: c.tier,
    }));
  }, [capFilter]);

  const femaleTop = useCallback(() => {
    return topN("female_pct", 15, false, capFilter).map((c) => ({
      name: shortName(c.company_name, 22),
      value: Math.round((c.female_pct as number) * 10) / 10,
      tier: c.tier,
    }));
  }, [capFilter]);

  const scope3PctTop = useCallback(() => {
    return topN("scope3_pct_of_total", 12, false, capFilter).map((c) => ({
      name: shortName(c.company_name, 22),
      value: Math.round((c.scope3_pct_of_total as number) * 10) / 10,
      tier: c.tier,
    }));
  }, [capFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HERO */}
      <header className="bg-gradient-to-br from-[#1b2a4a] via-[#2c3e6b] to-[#1b2a4a] text-white">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#4a90d9]">
            AccelentPartners
          </p>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-5xl">
            Indian Financial Sector ESG Deep Dive
          </h1>
          <p className="mb-2 text-lg text-slate-300">
            AMCs · Insurance · Wealth Management · NBFCs
          </p>
          <p className="text-sm text-slate-400">
            Scope 3 granular analysis from FY 2024-25 BRSR filings
          </p>
        </div>
      </header>

      {/* STATS BAR */}
      <section className="relative z-10 -mt-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
          {[
            [String(summary.total_companies), "Institutions Analysed"],
            [String(summary.scope3_reporters), "Scope 3 Reporters"],
            [`${Math.round(summary.avg_scope3_pct ?? 0)}%`, "Avg Scope 3 Share"],
            [`${Math.round(summary.avg_female_pct ?? 0)}%`, "Avg Female Employees"],
          ].map(([val, label]) => (
            <div key={label} className="rounded-xl bg-white px-5 py-4 text-center shadow-lg">
              <div className="text-2xl font-extrabold text-[#1b2a4a]">{val}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* KEY INSIGHT BANNER */}
      <section className="py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl border-l-4 border-[#4a90d9] bg-blue-50 px-6 py-5">
            <p className="text-sm font-bold text-[#1b2a4a]">
              Why Scope 3 is critical for Financial Institutions
            </p>
            <p className="mt-1 text-sm text-slate-600">
              For AMCs, insurers and wealth managers, Scope 3 (financed emissions, business travel, supply chain)
              typically represents <strong>55–85% of total GHG footprint</strong> — far outweighing Scope 1+2 from direct operations.
              Only <strong>{summary.scope3_reporters} of {summary.total_companies} institutions</strong> currently report Scope 3 in their BRSR filings.
            </p>
          </div>
        </div>
      </section>

      {/* CAP SIZE FILTER */}
      <section className="bg-white py-4 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-slate-700">Filter by Tier:</label>
            <select
              value={capFilter}
              onChange={(e) => setCapFilter(e.target.value as "all" | "Large Cap" | "Mid Cap" | "Small Cap")}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4a90d9]"
            >
              <option value="all">All Institutions</option>
              <option value="Large Cap">Large Cap</option>
              <option value="Mid Cap">Mid Cap</option>
              <option value="Small Cap">Small Cap / NBFC</option>
            </select>
            <span className="text-xs text-slate-400">
              {capFilter === "all" ? `${companies.length} institutions` : `${filteredCompanies().length} institutions`}
            </span>
          </div>
        </div>
      </section>

      {mounted && (
        <>
          {/* SCOPE 3 DEEP DIVE */}
          <section className="bg-slate-50 py-14">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeader
                title="Scope 3 Emissions Deep Dive"
                subtitle="Financed emissions, business travel & supply chain — the dominant footprint for financial institutions"
              />
              <div className="grid gap-8 md:grid-cols-2">

                {/* Scope 3 adoption by tier */}
                <ChartCard title="Scope 3 Reporting Adoption by Tier">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={scope3Adoption} margin={{ left: 0, right: 20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Reporting" stackId="a" fill="#10b981" name="Reporting Scope 3" />
                      <Bar dataKey="Not Reporting" stackId="a" fill="#e2e8f0" name="Not Reporting" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Scope 3 % of total */}
                <ChartCard title="Scope 3 as % of Total GHG" accent="blue">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={scope3PctTop()} layout="vertical" margin={{ left: 10, right: 50 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => [`${v}%`, "Scope 3 %"]} />
                      <Bar dataKey="value" fill="#4a90d9" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 9, fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Top Scope 3 emitters */}
                <ChartCard title="Top Scope 3 Emitters (tCO₂e)" accent="red">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={scope3Top()} layout="vertical" margin={{ left: 10, right: 70 }}>
                      <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => [Number(v).toLocaleString("en-IN") + " tCO₂e", "Scope 3"]} />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                        {scope3Top().map((entry) => (
                          <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#ef4444"} />
                        ))}
                        <LabelList dataKey="value" position="right" formatter={(v) => `${(Number(v)/1000).toFixed(0)}K`} style={{ fontSize: 9 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Scope 1+2+3 stacked comparison */}
                <ChartCard title="Scope 1 + 2 + 3 Full Footprint (tCO₂e)" subtitle="Top 15 companies reporting all scopes">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={scopeBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v, name) => [Number(v).toLocaleString("en-IN") + " tCO₂e", String(name)]} />
                      <Legend />
                      <Bar dataKey="Scope1" stackId="a" fill="#1b2a4a" name="Scope 1" />
                      <Bar dataKey="Scope2" stackId="a" fill="#4a90d9" name="Scope 2" />
                      <Bar dataKey="Scope3" stackId="a" fill="#f97316" name="Scope 3" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

              </div>
            </div>
          </section>

          {/* SCOPE 1+2 & INTENSITY */}
          <section className="bg-white py-14">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeader
                title="Scope 1 & 2 — Operational Emissions"
                subtitle="Direct and energy-related GHG from offices, data centres, and operations"
              />
              <div className="grid gap-8 md:grid-cols-2">

                {/* Top total GHG emitters */}
                <ChartCard title="Top Scope 1+2 Emitters (tCO₂e)" accent="red">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={ghgTop()} layout="vertical" margin={{ left: 10, right: 70 }}>
                      <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => [Number(v).toLocaleString("en-IN") + " tCO₂e", "Scope 1+2"]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {ghgTop().map((entry) => (
                          <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#1b2a4a"} />
                        ))}
                        <LabelList dataKey="value" position="right" formatter={(v) => `${(Number(v)/1000).toFixed(1)}K`} style={{ fontSize: 9 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* GHG intensity per Cr revenue */}
                <ChartCard title="GHG Intensity (tCO₂e per ₹Cr Revenue)" accent="amber">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={ghgIntensity} layout="vertical" margin={{ left: 10, right: 50 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => [`${v} tCO₂e/₹Cr`, "GHG Intensity"]} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                        {ghgIntensity.map((entry) => (
                          <Cell key={entry.name} fill={TIER_COLORS[entry.tier] || "#f59e0b"} />
                        ))}
                        <LabelList dataKey="value" position="right" style={{ fontSize: 9 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Scope 3 vs Scope 1+2 scatter */}
                <ChartCard title="Scope 3 vs Scope 1+2 — Scale Comparison" subtitle="Size of Scope 3 relative to operational emissions">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number" dataKey="x" name="Scope 1+2"
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
                        tick={{ fontSize: 10 }}
                        label={{ value: "Scope 1+2 (tCO₂e)", position: "insideBottom", offset: -12, fontSize: 10 }}
                      />
                      <YAxis
                        type="number" dataKey="y" name="Scope 3"
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}K`}
                        tick={{ fontSize: 10 }}
                        label={{ value: "Scope 3 (tCO₂e)", angle: -90, position: "insideLeft", fontSize: 10 }}
                      />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="rounded bg-white px-3 py-2 text-xs shadow-lg border border-slate-200">
                              <p className="font-bold text-slate-800">{d.name}</p>
                              <p className="text-slate-500">Scope 1+2: {d.x.toLocaleString("en-IN")} tCO₂e</p>
                              <p className="text-orange-500">Scope 3: {d.y.toLocaleString("en-IN")} tCO₂e</p>
                            </div>
                          );
                        }}
                      />
                      {["Large Cap", "Mid Cap", "Small Cap"].map((tier) => (
                        <Scatter
                          key={tier}
                          name={tier}
                          data={scopeScatter.filter((d) => d.tier === tier)}
                          fill={TIER_COLORS[tier]}
                          opacity={0.8}
                        />
                      ))}
                      <Legend />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Universe overview */}
                <ChartCard title="Universe by Tier">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tierDist}
                        cx="50%" cy="50%"
                        innerRadius={65} outerRadius={110}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {tierDist.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} institutions`]} />
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
              </div>
            </div>
          </section>

          {/* SOCIAL */}
          <section className="bg-slate-50 py-14">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeader title="Social — Gender & Workforce" subtitle="Female representation across financial institutions" />
              <div className="grid gap-8 md:grid-cols-2">

                <ChartCard title="Top 15 by Female Employee %" accent="blue">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={femaleTop()} layout="vertical" margin={{ left: 10, right: 50 }}>
                      <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => [`${v}%`, "Female %"]} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 9, fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Avg Female Employee % by Tier">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={femaleByTier} layout="vertical" margin={{ left: 10, right: 50 }}>
                      <XAxis type="number" domain={[0, 40]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={85} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, "Avg Female %"]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {femaleByTier.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                        <LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

              </div>
            </div>
          </section>

          {/* RANKINGS */}
          <section className="bg-white py-14">
            <div className="mx-auto max-w-6xl px-6">
              <SectionHeader title="ESG Rankings" subtitle="Top performers across emissions, social, and transparency dimensions" />
              <div className="grid gap-8 md:grid-cols-2">
                <RankingTable
                  title="Highest Scope 3 Emitters (tCO₂e)"
                  items={topN("scope3_cy", 10, false).map((c) => ({
                    name: c.company_name, tier: c.tier,
                    value: Math.round(c.scope3_cy!).toLocaleString("en-IN") + " tCO₂e",
                  }))}
                  accent="red"
                />
                <RankingTable
                  title="Highest Scope 3 Share of Total GHG"
                  items={topN("scope3_pct_of_total", 10, false).map((c) => ({
                    name: c.company_name, tier: c.tier,
                    value: pct(c.scope3_pct_of_total as number),
                  }))}
                  accent="amber"
                />
                <RankingTable
                  title="Lowest Scope 1+2 Emitters (tCO₂e)"
                  items={topN("total_ghg_cy", 10, true).map((c) => ({
                    name: c.company_name, tier: c.tier,
                    value: Math.round(c.total_ghg_cy!).toLocaleString("en-IN") + " tCO₂e",
                  }))}
                  accent="green"
                />
                <RankingTable
                  title="Best Female Representation"
                  items={topN("female_pct", 10, false).map((c) => ({
                    name: c.company_name, tier: c.tier,
                    value: pct(c.female_pct as number),
                  }))}
                  accent="blue"
                />
                <RankingTable
                  title="Best Renewable Energy Share"
                  items={topN("renewable_share_pct", 10, false).map((c) => ({
                    name: c.company_name, tier: c.tier,
                    value: pct(c.renewable_share_pct as number),
                  }))}
                  accent="green"
                />
                <RankingTable
                  title="Scope 3 NOT Yet Reported"
                  items={companies
                    .filter((c) => !c.scope3_cy)
                    .sort((a, b) => (b.revenue_cy || 0) - (a.revenue_cy || 0))
                    .slice(0, 10)
                    .map((c) => ({
                      name: c.company_name, tier: c.tier,
                      value: c.revenue_cy ? `₹${Math.round(c.revenue_cy).toLocaleString("en-IN")} Cr` : "—",
                    }))}
                  accent="red"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-sm font-semibold text-[#1b2a4a]">AccelentPartners</p>
          <p className="mt-1 text-xs text-slate-500">
            BRSR Strategy · ESG Analytics · Assurance Readiness
          </p>
          <div className="mt-4 flex justify-center gap-6 text-xs text-slate-400">
            <a href="/" className="hover:text-[#4a90d9]">Pharma ESG Dashboard</a>
            <span>·</span>
            <span>Financial Sector ESG Dashboard</span>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Data sourced from publicly available BRSR filings (FY 2024-25). For informational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-bold text-[#1b2a4a]">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, accent, children }: {
  title: string; subtitle?: string; accent?: string; children: React.ReactNode;
}) {
  const accentBar: Record<string, string> = {
    green: "bg-emerald-500", red: "bg-red-500",
    blue: "bg-blue-500", amber: "bg-amber-500",
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

function RankingTable({ title, items, accent }: {
  title: string; items: { name: string; tier: string; value: string }[]; accent: string;
}) {
  const headerColors: Record<string, string> = {
    green: "bg-emerald-600", red: "bg-red-600",
    blue: "bg-blue-600", amber: "bg-amber-500",
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
