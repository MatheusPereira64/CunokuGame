/**
 * Transforma as linhas do log da partida em avisos curtos para a mesa.
 * O log é a mesma fonte para humanos e bots, online e offline.
 */

export type ActionKind =
  | "draw_deck"
  | "draw_discard"
  | "discard"
  | "replace"
  | "jack"
  | "peek_own"
  | "peek"
  | "swap"
  | "seal"
  | "queen"
  | "king"
  | "joker"
  | "wind"
  | "forced"
  | "penalty_draw"
  | "penalty_skip";

export interface ActionEvent {
  actorId: string;
  kind: ActionKind;
  /** Jogadores atingidos pela ação (por id), quando há. */
  targetIds: string[];
  /** Variáveis do texto: target, card, a, b. */
  vars: Record<string, string>;
}

/** Ações em que outro jogador mexe nas suas cartas: merecem um alerta para você. */
const TARGETED: ReadonlySet<ActionKind> = new Set<ActionKind>(["peek", "swap", "seal", "queen", "king", "wind", "forced"]);

/** Habilidades ficam mais tempo na tela que compras e descartes. */
export const ABILITY_KINDS: ReadonlySet<ActionKind> = new Set<ActionKind>([
  "jack",
  "peek_own",
  "peek",
  "swap",
  "seal",
  "queen",
  "king",
  "joker",
  "wind",
  "forced",
]);

const SUIT_SYMBOL: Record<string, string> = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };

/** "7 de hearts" → "7♥"; Coringa sem naipe. */
export function cardLabel(rank: string, suit: string): string {
  if (rank === "Joker") return "🃏";
  return `${rank}${SUIT_SYMBOL[suit] ?? ""}`;
}

type Named = { id: string; name: string };

/** Nome mais longo primeiro: "Ana Paula" não pode casar como "Ana". */
function findActor(line: string, players: Named[]): { player: Named; rest: string } | null {
  const sorted = [...players].sort((a, b) => b.name.length - a.name.length);
  for (const p of sorted) {
    if (p.name && line.startsWith(`${p.name} `)) return { player: p, rest: line.slice(p.name.length + 1) };
  }
  return null;
}

function idOf(name: string, players: Named[]): string | undefined {
  return players.find((p) => p.name === name)?.id;
}

type Rule = {
  re: RegExp;
  build: (m: RegExpMatchArray, players: Named[]) => Omit<ActionEvent, "actorId">;
};

const target = (kind: ActionKind) => (m: RegExpMatchArray, players: Named[]) => {
  const id = idOf(m[1], players);
  return { kind, targetIds: id ? [id] : [], vars: { target: m[1] } };
};
const plain = (kind: ActionKind) => () => ({ kind, targetIds: [], vars: {} });

/** Ordem importa: padrões mais específicos antes dos genéricos. */
const RULES: Rule[] = [
  { re: /^comprou uma carta do baralho$/, build: plain("draw_deck") },
  {
    re: /^comprou a carta (.+?) de (\w+) da pilha de descarte$/,
    build: (m) => ({ kind: "draw_discard", targetIds: [], vars: { card: cardLabel(m[1], m[2]) } }),
  },
  { re: /^substituiu a carta \d+ da mão$/, build: plain("replace") },
  { re: /^usou o Valete e comprou mais uma carta$/, build: plain("jack") },
  { re: /^usou habilidade para ver uma de suas cartas$/, build: plain("peek_own") },
  { re: /^usou habilidade para ver uma carta de (.+)$/, build: target("peek") },
  {
    re: /^trocou a carta \d+ de (.+?) com a carta \d+ de (.+)$/,
    build: (m, players) => ({
      kind: "swap",
      targetIds: [idOf(m[1], players), idOf(m[2], players)].filter((id): id is string => !!id),
      vars: { a: m[1], b: m[2] },
    }),
  },
  { re: /^selou uma carta de (.+)$/, build: target("seal") },
  { re: /^usou a Rainha em (.+)$/, build: target("queen") },
  { re: /^usou o Rei para ver as cartas de (.+)$/, build: target("king") },
  { re: /^usou o Coringa para ver as cartas de todos$/, build: plain("joker") },
  { re: /^usou o Vento nas cartas de (.+)$/, build: target("wind") },
  { re: /^forçou (.+?) a trocar uma carta$/, build: target("forced") },
  { re: /^tentou descartar carta errada! Perde a vez/, build: plain("penalty_skip") },
  { re: /^tentou descartar carta errada! Compra/, build: plain("penalty_draw") },
  {
    re: /^descartou a carta (.+?) de (\w+)/,
    build: (m) => ({ kind: "discard", targetIds: [], vars: { card: cardLabel(m[1], m[2]) } }),
  },
];

export function parseActionLog(line: string, players: Named[]): ActionEvent | null {
  const found = findActor(line, players);
  if (!found) return null;
  for (const rule of RULES) {
    const m = found.rest.match(rule.re);
    if (m) return { actorId: found.player.id, ...rule.build(m, players) };
  }
  return null;
}

/** A ação mexeu nas cartas de quem está vendo, feita por outra pessoa. */
export function targetsViewer(event: ActionEvent, viewerId: string): boolean {
  return event.actorId !== viewerId && TARGETED.has(event.kind) && event.targetIds.includes(viewerId);
}

/** Chave de texto do aviso no assento; "you" quando o alvo é quem está vendo. */
export function seatTextKey(event: ActionEvent, viewerId: string): string {
  const onMe = event.targetIds.includes(viewerId);
  if (event.kind === "swap") return onMe ? "feed.swap.you" : "feed.swap";
  if (TARGETED.has(event.kind)) return onMe ? `feed.${event.kind}.you` : `feed.${event.kind}`;
  return `feed.${event.kind}`;
}
