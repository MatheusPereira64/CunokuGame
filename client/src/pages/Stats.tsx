import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { MetricsSummary } from "@shared/metrics";
import { useI18n } from "@/contexts/i18n-context";
import { apiUrl } from "@/lib/gameServer";

type Load = { status: "loading" } | { status: "error" } | { status: "ok"; summary: MetricsSummary };

const ROUND_BUCKETS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11-12", "13-15", "16+"];
const DAY_OPTIONS = [7, 30, 90];

/** Página pública com os números anônimos do jogo (partidas por dia, modos, rodada do Cunoku). */
export default function Stats() {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: "loading" });
    fetch(apiUrl(`/api/rank/metrics/summary?days=${days}`), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return setLoad({ status: "error" });
        setLoad({ status: "ok", summary: (await res.json()) as MetricsSummary });
      })
      .catch((err) => {
        if (!controller.signal.aborted && err) setLoad({ status: "error" });
      });
    return () => controller.abort();
  }, [days]);

  return (
    <div className="flex min-h-[100dvh] items-start justify-center px-4 pb-10 pt-6">
      <div className="w-full max-w-lg">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-800 hover:underline">
          <ArrowLeft className="h-4 w-4" /> {t("profilePage.play")}
        </Link>
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4 shadow-xl sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-2xl text-indigo-900">{t("stats.title")}</h1>
            <div className="flex gap-1" role="group" aria-label={t("stats.period")}>
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  aria-pressed={days === d}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${days === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {t("stats.days", { count: String(d) })}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-4 text-xs text-gray-500">{t("stats.privacy")}</p>
          {load.status === "loading" && <p className="py-10 text-center text-gray-500">{t("competition.loading")}</p>}
          {load.status === "error" && <p className="py-10 text-center text-gray-600">{t("competition.offline")}</p>}
          {load.status === "ok" && <StatsBody summary={load.summary} />}
        </div>
      </div>
    </div>
  );
}

function StatsBody({ summary }: { summary: MetricsSummary }) {
  const { t } = useI18n();
  const total = summary.totals["games"] ?? 0;
  if (total === 0) return <p className="py-10 text-center text-gray-500">{t("stats.empty")}</p>;

  const share = (key: string, of = total) => {
    const n = summary.totals[key] ?? 0;
    return { n, pct: of > 0 ? Math.round((n / of) * 100) : 0 };
  };
  const botGames = summary.totals["games.mode.bots"] ?? 0;
  const modes = (["bots", "online", "daily"] as const).map((m) => ({ label: t(`stats.mode.${m}`), ...share(`games.mode.${m}`) }));
  const difficulties = (["easy", "medium", "hard", "professor"] as const).map((d) => ({
    label: t(`stats.difficulty.${d}`),
    ...share(`games.bots.${d}`, botGames),
  }));
  const players = [2, 3, 4, 5, 6].map((p) => ({ label: t("stats.playersN", { count: String(p) }), ...share(`games.players.${p}`) }));
  const rounds = ROUND_BUCKETS.map((b) => ({ label: b, n: summary.totals[`cunoku.round.${b}`] ?? 0 }));
  const deckEnds = summary.totals["games.ended.deck"] ?? 0;
  const maxDay = Math.max(1, ...summary.perDay.map((d) => d.games));
  const maxRound = Math.max(1, ...rounds.map((r) => r.n));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <Tile label={t("stats.games")} value={String(total)} />
        <Tile label={t("stats.perDay")} value={(total / summary.days).toFixed(1)} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-indigo-900">{t("stats.daily")}</h2>
        <div className="flex h-24 items-end gap-[2px]" aria-label={t("stats.daily")}>
          {summary.perDay.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.games}`}
              className="flex-1 rounded-t bg-indigo-500"
              style={{ height: `${Math.max(4, (d.games / maxDay) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <Bars title={t("stats.modes")} rows={modes} />
      <Bars title={t("stats.difficulties")} rows={difficulties} />
      <Bars title={t("stats.players")} rows={players} />

      <section>
        <h2 className="mb-1 text-sm font-bold text-indigo-900">{t("stats.cunokuRound")}</h2>
        <p className="mb-2 text-xs text-gray-500">{t("stats.deckEnds", { count: String(deckEnds) })}</p>
        <div className="flex h-24 items-end gap-1">
          {rounds.map((r) => (
            <div key={r.label} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
              <div className="w-full rounded-t bg-amber-400" style={{ height: `${(r.n / maxRound) * 100}%` }} title={String(r.n)} />
              <span className="text-[9px] text-gray-500">{r.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-center">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="font-mono text-2xl font-bold text-indigo-900">{value}</div>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: { label: string; n: number; pct: number }[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-indigo-900">{title}</h2>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-xs">
            <span className="truncate text-gray-700">{r.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${r.pct}%` }} />
            </span>
            <span className="text-right font-mono text-gray-600">{r.n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
