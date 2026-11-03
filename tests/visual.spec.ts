import { expect, test } from "@playwright/test";

async function ready(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.decode().catch(() => {}),
      ),
    );
  });
}

test("regressão visual: início", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /Emerald Ape #042/ }).first(),
  ).toBeVisible();
  await ready(page);
  await expect(page).toHaveScreenshot("inicio.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("regressão visual: detalhe", async ({ page }) => {
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await ready(page);
  await expect(page).toHaveScreenshot("detalhe.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("regressão visual: carrinho", async ({ page }) => {
  await page.goto("/nft/emerald-ape-042");
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(
    page.getByRole("heading", { name: "Carrinho de NFTs" }),
  ).toBeVisible();
  await ready(page);
  await expect(page).toHaveScreenshot("carrinho.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("regressão visual: pagamento", async ({ page }) => {
  await page.goto("/nft/emerald-ape-042");
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await page.getByLabel("E-mail").fill("ana@kurio.test");
  await page.getByLabel("Senha").fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar compra" }),
  ).toBeEnabled();
  await ready(page);
  await expect(page).toHaveScreenshot("pagamento.png", {
    fullPage: true,
    animations: "disabled",
  });
});
