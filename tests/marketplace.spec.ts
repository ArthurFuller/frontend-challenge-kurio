import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("kurio-mock-db-v1");
    localStorage.removeItem("kurio-token");
    localStorage.removeItem("kurio-scenario");
    sessionStorage.clear();
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Buscar NFTs" }),
  ).toBeVisible();
});

test("busca, filtros e histórico da URL", async ({ page }) => {
  await page.getByRole("textbox", { name: "Buscar NFTs" }).fill("Emerald");
  await page.getByRole("textbox", { name: "Buscar NFTs" }).press("Enter");
  await expect(
    page.getByRole("link", { name: /Emerald Ape #042/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(/search=Emerald/);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Buscar NFTs" })).toHaveValue(
    "Emerald",
  );
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "Buscar NFTs" })).toHaveValue(
    "",
  );
});

test("detalhe, carrinho, login e pedido confirmado", async ({
  page,
  isMobile,
}) => {
  await page
    .getByRole("link", { name: /Emerald Ape #042/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(
    page.getByRole("heading", { name: "Carrinho de NFTs" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/login\?next=/);
  await page.getByRole("textbox", { name: "E-mail" }).fill("ana@kurio.test");
  await page.getByLabel("Senha").fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await expect(page.getByRole("heading", { name: "Pagamento" })).toBeVisible();
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado" }),
  ).toBeVisible();
  if (isMobile)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
});

test("detalhe inexistente e cupom inválido", async ({ page }) => {
  await page.goto("/nft/nao-existe");
  await expect(page.getByRole("alert")).toContainText("NFT não encontrado");
  await page.goto("/nft/emerald-ape-042");
  await page.getByRole("button", { name: "Comprar" }).click();
  await page
    .getByRole("textbox", { name: "Código promocional" })
    .fill("INVALIDO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert")).toContainText("Cupom inválido");
});

test("preço alterado chega pelo Socket.IO e atualiza o carrinho", async ({
  page,
}) => {
  await page
    .getByRole("link", { name: /Emerald Ape #042/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(page.getByText("1.206 ETH")).toBeVisible();
  await page.evaluate(async () => {
    await fetch("/api/__nft_update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "emerald-ape-042", priceEth: "1.49" }),
    });
  });
  await expect(page.getByText("1.506 ETH")).toBeVisible();
});

test("carrinho visitante permanece depois do login e do refresh", async ({
  page,
}) => {
  await page
    .getByRole("link", { name: /Emerald Ape #042/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(
    page.getByRole("heading", { name: "Carrinho de NFTs" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Carrinho de NFTs" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await page.getByLabel("E-mail").fill("ana@kurio.test");
  await page.getByLabel("Senha").fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await page.goto("/cart");
  await expect(page.getByText("1.206 ETH")).toBeVisible();
});

test("cadastro duplicado recebe conflito", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Nome completo").fill("Outra Ana");
  await page.getByLabel("Nome de usuário").fill("nova-ana");
  await page.getByLabel("E-mail").fill("ana@kurio.test");
  await page.getByLabel("Senha").fill("Kurio123!");
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page.getByRole("alert")).toContainText("já cadastrado");
});

test("recusa preserva os itens do carrinho", async ({ page }) => {
  await page
    .getByRole("link", { name: /Emerald Ape #042/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await page.getByLabel("E-mail").fill("ana@kurio.test");
  await page.getByLabel("Senha").fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await page.evaluate(async () => {
    await fetch("/api/__scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "payment-declined" }),
    });
  });
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(page.getByText("1.206 ETH")).toBeVisible();
});

test("timeout de pedido recupera a mesma tentativa", async ({ page }) => {
  await page
    .getByRole("link", { name: /Emerald Ape #042/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.getByRole("button", { name: "Finalizar compra" }).click();
  await page.getByLabel("E-mail").fill("ana@kurio.test");
  await page.getByLabel("Senha").fill("Kurio123!");
  await page
    .getByRole("button", { name: "Entrar", exact: true })
    .last()
    .click();
  await page.evaluate(async () => {
    await fetch("/api/__scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "order-timeout" }),
    });
  });
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kurio-mock-db-v1") || "{}").orders
          .length,
    ),
  ).toBe(1);
});

test("filtros mobile abrem em diálogo", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile");
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  await expect(page.getByRole("dialog", { name: "Filtros" })).toBeVisible();
  await page.getByRole("dialog").getByLabel("Categoria").selectOption("Arte");
  await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/category=Arte/);
});
