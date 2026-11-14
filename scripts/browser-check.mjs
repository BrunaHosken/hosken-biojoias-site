// Requer site + emuladores rodando e npm run db:seed concluído.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch();
const errors = [];
await mkdir(".artifacts", { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5173/");
  await page.screenshot({
    path: ".artifacts/home-desktop.png",
    fullPage: true,
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/loja",
      "/contato",
      "/carrinho",
      "/conta",
      "/sobre",
      "/novidades",
      "/eventos",
      "/onde-encontrar",
    ]) {
      await page.goto(`http://127.0.0.1:5173${path}`);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
        `Overflow ${width}px: ${path}`,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Loja", exact: true })
    .click();
  await page.getByRole("link", { name: /Conjunto Orquídea/ }).waitFor();
  await page.screenshot({ path: ".artifacts/shop-mobile.png", fullPage: true });
  await page.getByLabel("Tipo de peça").selectOption("colar");
  await page.getByRole("link", { name: /Colar Jardim/ }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: /Conjunto Orquídea/ }).count(),
    0,
  );
  await page.getByRole("link", { name: /Colar Jardim/ }).click();
  await page.getByRole("button", { name: /Adicionar à sacola/ }).click();
  await page.getByRole("link", { name: "Ver carrinho →" }).click();
  await page.getByRole("heading", { name: "Colar Jardim" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Colar Jardim" }).waitFor();
  await page.goto("http://127.0.0.1:5173/admin");
  await page.getByRole("heading", { name: "Acesso administrativo" }).waitFor();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Entrar", exact: true })
    .click();
  await page.getByLabel("E-mail").fill("admin@hosken.local");
  await page.getByLabel("Senha", { exact: true }).fill("HoskenLocal2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("link", { name: /Abrir administração/ }).click();
  await page.getByRole("heading", { name: "Cuidar do ateliê" }).waitFor();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
      `Overflow admin ${width}`,
    );
  }
  await page.getByRole("button", { name: "Novidades", exact: true }).click();
  const title = `Teste do navegador ${Date.now()}`;
  await page.getByLabel("Título").fill(title);
  await page
    .getByLabel("Texto")
    .fill("Registro temporário criado para verificar cadastro no Firestore.");
  await page.getByLabel("Publicação").selectOption("published");
  await page.getByRole("button", { name: /Salvar cadastro/ }).click();
  await page.getByText("Cadastro salvo no banco.", { exact: true }).waitFor();
  await page.goto("http://127.0.0.1:5173/novidades");
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  await page.goto("http://127.0.0.1:5173/admin");
  await page.getByRole("button", { name: "Novidades", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".admin-row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await page.getByText("Cadastro excluído.", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "OK: rotas sem overflow em 5 larguras; menu móvel; filtros; carrinho persistente; login; acesso admin; cadastro/leitura/exclusão no Firestore.",
  );
} finally {
  await browser.close();
}
