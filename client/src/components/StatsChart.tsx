import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useI18n } from "@/contexts/i18n-context";
import type { DailyStat } from "@/lib/playerProfile";

/** Carregado sob demanda: o recharts não precisa pesar no menu inicial. */
export default function StatsChart({ data }: { data: DailyStat[] }) {
  const { t, language } = useI18n();
  const config: ChartConfig = {
    wins: { label: t("profile.wins"), color: "#059669" },
    losses: { label: t("profile.losses"), color: "#6366f1" },
  };
  const formatDay = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(language, { day: "2-digit", month: "2-digit" });

  const rows = data.map((d) => ({ day: d.day, wins: d.wins, losses: d.games - d.wins }));

  return (
    <ChartContainer config={config} className="h-40 w-full">
      <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: -28 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          minTickGap={36}
          tickFormatter={formatDay}
          fontSize={10}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} fontSize={10} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(_, payload) => formatDay(payload?.[0]?.payload?.day ?? "")} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="wins" stackId="games" fill="var(--color-wins)" stroke="hsl(var(--background))" isAnimationActive={false} />
        <Bar
          dataKey="losses"
          stackId="games"
          fill="var(--color-losses)"
          stroke="hsl(var(--background))"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
