import { expect, test, type Page } from "@playwright/test";

/** Evita o convite do app e as dicas de primeira partida, que cobririam a mesa. */
async function dismissOverlays(page: Page) {
  for (const name of ["Agora não", "Pular", "Não mostrar dicas", "Entendi"]) {
    const button = page.getByRole("button", { name, exact: true });
    if (await button.isVisible().catch(() => false)) await button.click().catch(() => undefined);
  }
}

test("joga uma partida inteira contra os bots até o fim", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await dismissOverlays(page);
  await page.getByRole("button", { name: "Jogar Contra Bots" }).click();
  await page.getByPlaceholder("Digite seu nome...").fill("E2E");
  await page.getByRole("button", { name: "Iniciar Partida" }).click();
  await expect(page).toHaveURL(/\/game\/offline/);

  const deck = page.getByRole("button", { name: /BARALHO/ });
  const discard = page.getByRole("button", { name: "Descartar", exact: true });
  const gameOver = page.getByRole("dialog").getByText("Fim de Jogo", { exact: true });
  let turns = 0;

  // Na nossa vez: compra do baralho e descarta. Os bots jogam sozinhos até alguém declarar Cunoku
  // ou o baralho acabar. O limite evita que um travamento vire um teste infinito.
  for (let i = 0; i < 600 && !(await gameOver.isVisible()); i++) {
    await dismissOverlays(page);
    if (await discard.isVisible()) {
      await discard.click();
      turns++;
    } else if (await deck.isEnabled().catch(() => false)) {
      await deck.click({ timeout: 2000 }).catch(() => undefined);
    }
    await page.waitForTimeout(400);
  }

  await expect(gameOver).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/O vencedor é/)).toBeVisible();
  expect(turns).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});
