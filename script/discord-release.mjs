// Posta o aviso de versão nova no Discord (webhook) depois que a release do GitHub sai.
// Uso no CI: DISCORD_WEBHOOK_URL=... VERSION=1.4.5 ASSETS="a.apk b.ipa" node script/discord-release.mjs
// Teste local sem enviar nada: node script/discord-release.mjs --dry-run 1.4.5
import { readFileSync, existsSync } from "node:fs";

const REPO = "MatheusPereira64/CunokuGame";
const PLAY_URL = "https://cunoku.cunokugame.workers.dev";
/** Limite do Discord para a descrição de um embed é 4096; deixamos folga. */
const MAX_DESCRIPTION = 3500;

const dryRun = process.argv.includes("--dry-run");
const version = (process.env.VERSION || process.argv.filter((a) => !a.startsWith("--"))[2] || "").replace(/^v/, "");
if (!version) {
  console.error("VERSION não informada");
  process.exit(1);
}

const webhook = process.env.DISCORD_WEBHOOK_URL;
if (!webhook && !dryRun) {
  // Sem segredo configurado a release segue normalmente, só sem aviso
  console.log("DISCORD_WEBHOOK_URL não configurado: aviso no Discord ignorado");
  process.exit(0);
}

/** Pega uma seção "### Título" das notas da versão (até a próxima seção). */
function section(notes, title) {
  const lines = notes.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `### ${title}`.toLowerCase());
  if (start < 0) return "";
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3}\s/.test(line)) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

const notesPath = `releases/RELEASE_NOTES_${version}.md`;
const notes = existsSync(notesPath) ? readFileSync(notesPath, "utf8") : "";
const parts = [
  ["Novidades", section(notes, "Novidades")],
  ["Animações", section(notes, "Animações")],
  ["Melhorias", section(notes, "Melhorias")],
  ["Correções", section(notes, "Correções")],
].filter(([, body]) => body);

let description = parts.map(([title, body]) => `**${title}**\n${body}`).join("\n\n");
if (!description) description = "Uma versão nova do Cunoku está disponível.";
if (description.length > MAX_DESCRIPTION) {
  description = `${description.slice(0, MAX_DESCRIPTION).replace(/\n[^\n]*$/, "")}\n…`;
}

const releaseUrl = `https://github.com/${REPO}/releases/tag/v${version}`;
const assets = (process.env.ASSETS || `Cunoku-${version}.apk Cunoku-${version}.ipa`).split(/\s+/).filter(Boolean);
const download = (name) => `https://github.com/${REPO}/releases/download/v${version}/${name}`;
const links = [`🌐 [Jogar no navegador](${PLAY_URL})`];
const apk = assets.find((a) => a.endsWith(".apk"));
const ipa = assets.find((a) => a.endsWith(".ipa"));
if (apk) links.push(`🤖 [Baixar para Android (APK)](${download(apk)})`);
if (ipa) links.push(`🍎 [Baixar para iPhone (IPA)](${download(ipa)})`);
links.push(`📋 [Notas completas](${releaseUrl})`);

const payload = {
  username: "Cunoku",
  content: `🎴 **Cunoku ${version}** saiu! Quem já tem o app recebe o aviso de atualização ao abrir.`,
  embeds: [
    {
      title: `Cunoku ${version}`,
      url: releaseUrl,
      color: 0xd4af37,
      description,
      fields: [{ name: "Links", value: links.join("\n") }],
    },
  ],
  // Nunca mencionar @everyone ou cargos por causa do texto das notas
  allowed_mentions: { parse: [] },
};

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!response.ok) {
  // Resposta externa: sem quebras de linha nem caracteres de controle, para não forjar linhas no log
  const detail = (await response.text()).replaceAll(/[\u0000-\u001f\u007f]+/g, " ").slice(0, 300);
  console.error(`Discord respondeu ${response.status}: ${detail}`);
  process.exit(1);
}
console.log(`Aviso da versão ${version} enviado ao Discord`);
