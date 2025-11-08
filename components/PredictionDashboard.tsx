'use client';

import { useMemo, useState } from "react";
import { companies } from "@/lib/companies";
import {
  baseRiskTolerance,
  buildLigthhouseInsight,
  computeStats,
  defaultMacroView,
  defaultWeights,
  generatePredictions,
  summariseThemes,
  type CompanyPrediction,
  type MacroView,
  type WeightProfile
} from "@/lib/analysis";

type MarketCapFocus = "All" | "Emerging" | "Mid" | "Large";

const sectorOptions = Array.from(new Set(companies.map((company) => company.sector))).sort();

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const marketCapFilters: Record<MarketCapFocus, (marketCapCr: number) => boolean> = {
  All: () => true,
  Emerging: (mc) => mc < 10000,
  Mid: (mc) => mc >= 10000 && mc <= 60000,
  Large: (mc) => mc > 60000
};

const convictionBadgeClass: Record<CompanyPrediction["projection"]["convictionTag"], string> = {
  "High Conviction": "text-emerald-300 bg-emerald-300/10 ring-emerald-400/40",
  Emerging: "text-cyan-300 bg-cyan-300/10 ring-cyan-400/30",
  Momentum: "text-orange-300 bg-orange-300/10 ring-orange-400/30",
  "Value Unlock": "text-sky-300 bg-sky-300/10 ring-sky-400/30"
};

const weightLabels: Record<keyof WeightProfile, string> = {
  growth: "Growth",
  quality: "Quality",
  efficiency: "Efficiency",
  valuation: "Valuation Comfort",
  momentum: "Momentum",
  macro: "Macro Sensitivity"
};

const macroLabels: Record<keyof MacroView, string> = {
  gdpGrowth: "GDP Growth Bias",
  inflation: "Inflation Outlook",
  rupeeOutlook: "Rupee Strength",
  policySupport: "Policy Support"
};

const formatNumber = (value: number) => value.toLocaleString("en-IN");

const formatScore = (score: number) => `${score.toFixed(1)} / 100`;

const formatPercentage = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

const formatCagr = (value: number) => `${value.toFixed(1)}%`;

const riskToleranceCopy = (value: number) => {
  if (value < 0.4) return "Conservative";
  if (value < 0.65) return "Balanced";
  return "Aggressive";
};

const ScorePill = ({ score }: { score: number }) => (
  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/40">
    {formatScore(score)}
  </span>
);

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  description?: string;
  onChange: (next: number) => void;
  format?: (value: number) => string;
}

const SliderControl = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  description,
  format = (v) => v.toFixed(2),
  onChange
}: SliderControlProps) => (
  <label className="flex flex-col gap-3 rounded-xl border border-white/5 bg-slate-900/60 p-4">
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm font-medium text-slate-200">{label}</div>
      <span className="text-sm font-semibold text-brand-200">{format(value)}</span>
    </div>
    {description ? <p className="text-sm text-slate-400">{description}</p> : null}
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className="accent-brand-500"
    />
  </label>
);

const OpportunityCard = ({ prediction }: { prediction: CompanyPrediction }) => {
  const { company, score, projection, catalysts, risks } = prediction;
  const insight = buildLigthhouseInsight(prediction);

  return (
    <article className="gradient-border relative flex flex-col gap-4 rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-glow">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-heading text-xl font-semibold text-slate-50">{company.name}</h3>
          <p className="text-sm text-slate-400">
            {company.ticker} • {company.sector} / {company.subSector}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <ScorePill score={score} />
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${convictionBadgeClass[projection.convictionTag]}`}
          >
            {projection.convictionTag}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-300">{insight.headline}</p>

      {insight.strengths.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {insight.strengths.map((strength) => (
            <span key={strength} className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              {strength}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Projected CAGR</p>
          <p className="text-lg font-semibold text-emerald-300">{formatCagr(projection.projectedCagr)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Confidence</p>
          <p className="text-lg font-semibold text-brand-200">{formatPercentage(projection.confidence)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Downside Shield</p>
          <p className="text-lg font-semibold text-slate-50">{projection.downsideProtection.toFixed(1)} / 100</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Catalysts</h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {catalysts.slice(0, 3).map((catalyst) => (
              <li key={catalyst} className="leading-relaxed">
                • {catalyst}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-orange-300">Risk Radar</h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {risks.slice(0, 2).map((risk) => (
              <li key={risk} className="leading-relaxed">
                • {risk}
              </li>
            ))}
            <li className="text-xs text-slate-500">Stay agile: reassess if macro conditions shift materially.</li>
          </ul>
        </div>
      </div>
    </article>
  );
};

const BreakdownBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex items-center justify-between text-xs text-slate-400">
      <span>{label}</span>
      <span className="font-semibold text-slate-200">{(value * 100).toFixed(0)}%</span>
    </div>
    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${clamp(value) * 100}%` }} />
    </div>
  </div>
);

const DetailedTable = ({ predictions }: { predictions: CompanyPrediction[] }) => (
  <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
    <table className="min-w-full divide-y divide-white/5 text-sm text-slate-200">
      <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
        <tr>
          <th className="px-4 py-3 text-left">Company</th>
          <th className="px-4 py-3 text-left">Sector</th>
          <th className="px-4 py-3 text-left">M.Cap (₹ Cr)</th>
          <th className="px-4 py-3 text-left">Score</th>
          <th className="px-4 py-3 text-left">CAGR</th>
          <th className="px-4 py-3 text-left">Breakdown</th>
          <th className="px-4 py-3 text-left">Highlights</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {predictions.map((prediction) => (
          <tr key={prediction.company.id} className="hover:bg-white/5">
            <td className="px-4 py-4">
              <div className="font-medium text-slate-100">{prediction.company.name}</div>
              <div className="text-xs text-slate-400">
                {prediction.company.ticker} • {prediction.company.subSector}
              </div>
            </td>
            <td className="px-4 py-4 text-slate-300">{prediction.company.sector}</td>
            <td className="px-4 py-4 tabular-nums text-slate-300">{formatNumber(prediction.company.marketCapCr)}</td>
          <td className="px-4 py-4">
            <ScorePill score={prediction.score} />
          </td>
          <td className="px-4 py-4 text-emerald-300">
            {formatCagr(prediction.projection.projectedCagr)} / {formatPercentage(prediction.projection.confidence)}
          </td>
            <td className="px-4 py-4 space-y-1">
              <BreakdownBar label="Growth" value={prediction.breakdown.growth} />
              <BreakdownBar label="Quality" value={prediction.breakdown.quality} />
              <BreakdownBar label="Efficiency" value={prediction.breakdown.efficiency} />
              <BreakdownBar label="Valuation" value={prediction.breakdown.valuation} />
              <BreakdownBar label="Momentum" value={prediction.breakdown.momentum} />
            </td>
            <td className="px-4 py-4 text-xs text-slate-300">
              <p>{prediction.company.description}</p>
              <p className="mt-2 text-slate-400">Catalyst: {prediction.catalysts[0]}</p>
              <p className="text-slate-500">Watch: {prediction.risks[0]}</p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ThemePanel = ({ predictions }: { predictions: CompanyPrediction[] }) => {
  const themes = summariseThemes(predictions.slice(0, 8));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {themes.map((theme) => (
        <div key={theme.sector} className="rounded-2xl border border-white/5 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-lg font-semibold text-slate-50">{theme.sector}</h4>
            <ScorePill score={theme.averageScore} />
          </div>
          <p className="mt-2 text-sm text-slate-300">{theme.keyTailwind}</p>
          <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Sector Lighthouse</p>
            <p className="mt-1 text-sm text-slate-200">
              {theme.leader.company.name} leads with {formatScore(theme.leader.score)} and projected CAGR{" "}
              {formatCagr(theme.leader.projection.projectedCagr)}.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const emptyState = (
  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-10 text-center text-slate-400">
    No companies match the current filters. Relax the score cut-off or broaden your sector universe.
  </div>
);

const useWeightsState = () => {
  const [weights, setWeights] = useState<WeightProfile>(defaultWeights);

  const setWeight = (key: keyof WeightProfile) => (nextValue: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Number(nextValue.toFixed(2))
    }));
  };

  return { weights, setWeight };
};

const useMacroState = () => {
  const [macroView, setMacroView] = useState<MacroView>(defaultMacroView);
  const setMacro = (key: keyof MacroView) => (nextValue: number) => {
    setMacroView((prev) => ({
      ...prev,
      [key]: Number(nextValue.toFixed(2))
    }));
  };
  return { macroView, setMacro };
};

const useFilters = () => {
  const [riskTolerance, setRiskTolerance] = useState(baseRiskTolerance);
  const [sector, setSector] = useState<string>("All");
  const [marketCap, setMarketCap] = useState<MarketCapFocus>("All");
  const [minScore, setMinScore] = useState(58);
  const [search, setSearch] = useState("");

  return {
    riskTolerance,
    setRiskTolerance,
    sector,
    setSector,
    marketCap,
    setMarketCap,
    minScore,
    setMinScore,
    search,
    setSearch
  };
};

const filterPredictions = (
  predictions: CompanyPrediction[],
  {
    sector,
    marketCap,
    minScore,
    search
  }: { sector: string; marketCap: MarketCapFocus; minScore: number; search: string }
) => {
  const matchSearch = (candidate: CompanyPrediction) =>
    candidate.company.name.toLowerCase().includes(search.toLowerCase()) ||
    candidate.company.ticker.toLowerCase().includes(search.toLowerCase()) ||
    candidate.company.sector.toLowerCase().includes(search.toLowerCase());

  return predictions.filter((prediction) => {
    const passesSector = sector === "All" || prediction.company.sector === sector;
    const passesCap = marketCapFilters[marketCap](prediction.company.marketCapCr);
    const passesScore = prediction.score >= minScore;
    const passesSearch = !search || matchSearch(prediction);
    return passesSector && passesCap && passesScore && passesSearch;
  });
};

const HeaderSection = ({ stats }: { stats: ReturnType<typeof computeStats> }) => (
  <header className="glass relative overflow-hidden rounded-3xl border border-white/10 p-8 shadow-glow">
    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
    <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
    <div className="relative z-10 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.4em] text-brand-200">Multibagger Radar • India 2024</span>
        <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
          Discover the next wave of Indian multibagger opportunities
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          Scenario-aware intelligence engine synthesises growth, quality, valuations and macro sensitivity to surface high conviction ideas. Tune the dials to align with your thesis and risk appetite.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Top Cohort Score</dt>
          <dd className="mt-2 text-3xl font-semibold text-brand-100">{stats.eliteScore.toFixed(1)}</dd>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Expected CAGR (5Y)</dt>
          <dd className="mt-2 text-3xl font-semibold text-emerald-200">{stats.expectedCagr.toFixed(1)}%</dd>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-400">Confidence Index</dt>
          <dd className="mt-2 text-3xl font-semibold text-slate-100">{stats.conviction.toFixed(1)}%</dd>
        </div>
      </dl>
    </div>
  </header>
);

const ControlPanel = ({
  weights,
  setWeight,
  macroView,
  setMacro,
  riskTolerance,
  setRiskTolerance,
  sector,
  setSector,
  marketCap,
  setMarketCap,
  minScore,
  setMinScore,
  search,
  setSearch
}: {
  weights: WeightProfile;
  setWeight: (key: keyof WeightProfile) => (value: number) => void;
  macroView: MacroView;
  setMacro: (key: keyof MacroView) => (value: number) => void;
  riskTolerance: number;
  setRiskTolerance: (value: number) => void;
  sector: string;
  setSector: (value: string) => void;
  marketCap: MarketCapFocus;
  setMarketCap: (value: MarketCapFocus) => void;
  minScore: number;
  setMinScore: (value: number) => void;
  search: string;
  setSearch: (value: string) => void;
}) => (
  <section className="rounded-3xl border border-white/5 bg-slate-950/60 p-7">
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="lg:w-1/3">
        <h2 className="font-heading text-2xl font-semibold text-slate-50">Control Tower</h2>
        <p className="mt-2 text-sm text-slate-400">
          Adjust the portfolio DNA to align the engine with your thesis. All signals recalibrate instantly.
        </p>
        <div className="mt-6 space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Risk Appetite • {riskToleranceCopy(riskTolerance)}
            </span>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.01}
              value={riskTolerance}
              onChange={(event) => setRiskTolerance(Number(event.target.value))}
              className="accent-emerald-400"
            />
            <span className="text-sm text-slate-300">Penalty on risk factors adjusts dynamically.</span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Score Guardrail</span>
            <input
              type="range"
              min={40}
              max={80}
              step={1}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value))}
              className="accent-brand-500"
            />
            <span className="text-sm text-slate-300">
              Current cut-off: <span className="font-semibold text-brand-100">{minScore.toFixed(0)}</span>
            </span>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Sector Focus</span>
            <select
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-brand-400 focus:outline-none"
            >
              <option value="All">All Sectors</option>
              {sectorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Market Cap Lens</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(marketCapFilters) as MarketCapFocus[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMarketCap(option)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    marketCap === option
                      ? "border-brand-400 bg-brand-500/10 text-brand-100"
                      : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-brand-400/40 hover:text-slate-100"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Search</span>
            <input
              type="search"
              placeholder="Search by name, ticker or thesis keyword"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        {Object.entries(weights).map(([key, value]) => (
          <SliderControl
            key={key}
            label={weightLabels[key as keyof WeightProfile]}
            value={value}
            min={0.4}
            max={1.6}
            step={0.05}
            description={key === "valuation" ? "Dial higher for value bias, lower for high growth tolerance." : undefined}
            onChange={setWeight(key as keyof WeightProfile)}
          />
        ))}
        {Object.entries(macroView).map(([key, value]) => (
          <SliderControl
            key={key}
            label={macroLabels[key as keyof MacroView]}
            value={value}
            min={
              key === "gdpGrowth" ? 5 : key === "inflation" ? 4 : key === "rupeeOutlook" ? -2 : -1
            }
            max={
              key === "gdpGrowth" ? 8 : key === "inflation" ? 7 : key === "rupeeOutlook" ? 2 : 1
            }
            step={key === "rupeeOutlook" || key === "policySupport" ? 0.1 : 0.2}
            format={(val) => (key === "rupeeOutlook" || key === "policySupport" ? val.toFixed(1) : val.toFixed(1))}
            onChange={setMacro(key as keyof MacroView)}
          />
        ))}
      </div>
    </div>
  </section>
);

const SelectedUniverseSummary = ({ count, total }: { count: number; total: number }) => (
  <p className="text-sm text-slate-400">
    Screening {count} ideas from {total} tracked names. Adjust control tower to stress test outcomes under alternative macro regimes.
  </p>
);

const Disclaimer = () => (
  <footer className="mt-12 rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-xs text-slate-400">
    <p>
      This intelligence workspace is built for research augmentation. Signals combine historical data proxies, heuristics and scenario modelling—they are not investment advice. Markets are risky; validate independently, respect position sizing and consult a qualified advisor before acting.
    </p>
  </footer>
);

const HighlightGrid = ({ topPredictions }: { topPredictions: CompanyPrediction[] }) => (
  <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {topPredictions.map((prediction) => (
      <OpportunityCard key={prediction.company.id} prediction={prediction} />
    ))}
  </section>
);

const PredictionDashboard = () => {
  const { weights, setWeight } = useWeightsState();
  const { macroView, setMacro } = useMacroState();
  const filters = useFilters();

  const predictions = useMemo(
    () => generatePredictions(weights, macroView, filters.riskTolerance, companies),
    [weights, macroView, filters.riskTolerance]
  );

  const filteredPredictions = useMemo(
    () =>
      filterPredictions(predictions, {
        sector: filters.sector,
        marketCap: filters.marketCap,
        minScore: filters.minScore,
        search: filters.search
      }),
    [predictions, filters.sector, filters.marketCap, filters.minScore, filters.search]
  );

  const stats = useMemo(() => computeStats(predictions), [predictions]);

  const topPicks = filteredPredictions.slice(0, 3);

  return (
    <div className="flex flex-col gap-10 pb-10">
      <HeaderSection stats={stats} />
      <ControlPanel
        weights={weights}
        setWeight={setWeight}
        macroView={macroView}
        setMacro={setMacro}
        riskTolerance={filters.riskTolerance}
        setRiskTolerance={filters.setRiskTolerance}
        sector={filters.sector}
        setSector={filters.setSector}
        marketCap={filters.marketCap}
        setMarketCap={filters.setMarketCap}
        minScore={filters.minScore}
        setMinScore={filters.setMinScore}
        search={filters.search}
        setSearch={filters.setSearch}
      />
      <SelectedUniverseSummary count={filteredPredictions.length} total={predictions.length} />
      {filteredPredictions.length === 0 ? (
        emptyState
      ) : (
        <>
          <HighlightGrid topPredictions={topPicks} />
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold text-slate-50">Smart Scoreboard</h2>
            <DetailedTable predictions={filteredPredictions} />
          </div>
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold text-slate-50">Thematic Opportunity Radar</h2>
            <ThemePanel predictions={filteredPredictions} />
          </div>
        </>
      )}
      <Disclaimer />
    </div>
  );
};

export default PredictionDashboard;
