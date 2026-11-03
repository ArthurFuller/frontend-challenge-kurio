# Kurio Marketplace

Este é o meu projeto para o desafio de front-end: um marketplace de NFTs com catálogo, conta, carrinho e compra simulada. Usei o Figma como referência visual, sem alterar o arquivo original.

## Como fiz este desafio

Desenvolvi o projeto com apoio de IA, mais especificamente do **GPT-6 Sol**. O prazo era curto e eu ainda não tinha experiência com as ferramentas e aplicações pedidas no desafio. Já tenho, porém, bastante prática com IA, criação de prompts e desenvolvimento de aplicativos e jogos com ajuda de IA. Usei essa experiência para orientar a implementação, estudar as decisões e chegar a uma entrega funcional dentro do tempo disponível.

- [Demonstração pública](https://kurio-nft-marketplace-arthur.lutoxd363951.chatgpt.site)
- [Código no GitHub](https://github.com/ArthurFuller/frontend-challenge-kurio)

**Estado da entrega:** o projeto foi compilado e publicado. Ainda falta conferir manualmente todos os fluxos e comparar as telas com o Figma. Não rodei os testes Playwright nem as auditorias Lighthouse nesta revisão.

## Rodando no seu computador

Você precisa de Node.js e um navegador. Pode usar o VS Code para editar, mas não é obrigatório.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abra **http://127.0.0.1:5173/**. O Vite atualiza a página quando você salva uma mudança. Para parar, pressione `Ctrl+C` no terminal. As telas estão em `src/router.tsx`, os estilos em `src/style.css` e a API simulada em `src/mock/`.

## Dados de demonstração

| Usuário | Senha fictícia |
| --- | --- |
| `ana@kurio.test` | `Kurio123!` |
| `bruno@kurio.test` | `Kurio123!` |

Cupom válido: `KURIO10`. `EXPIRED` simula um cupom vencido. Nenhuma carteira ou compra real é usada. As senhas persistidas são hashes SHA-256 para este mock local; não use este mecanismo como autenticação de produção.

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Servidor local com MSW |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | Análise estática |
| `npm run build` | Build otimizado em `dist/` |
| `npm run preview -- --host localhost` | Serve o build em `http://localhost:4173` |
| `npm run test:e2e` | Playwright desktop e mobile, relatório HTML e traces em falhas |
| `npm run audit` | Três auditorias Lighthouse para início/detalhe e mobile/desktop; requer `preview` em outra janela |

Na primeira execução de Playwright, use `npx playwright install chromium`. O relatório dos testes fica em `playwright-report/index.html`. Os relatórios Lighthouse ficam em `reports/`.

## Cenários reproduzíveis

Abra o console do navegador na aplicação e execute, por exemplo:

```js
await fetch('/api/__scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'payment-declined' }) })
```

Valores: `normal`, `slow`, `variable`, `offline`, `timeout`, `error`, `favorite-error`, `session-expired`, `wallet-declined`, `payment-declined`, `order-timeout`. `normal` restaura o comportamento padrão. Para resetar integralmente os dados, execute `await fetch('/api/__reset', {method:'POST'})` e recarregue a página.

No pagamento, selecione uma carteira cadastrada, escolha o tipo de conexão e pressione **Conectar carteira** antes de revisar. `wallet-declined` simula a recusa dessa conexão. O cupom aplicado no carrinho segue para a cotação do pagamento.

Para simular uma mudança de preço e receber `nft.updated` via Socket.IO:

```js
await fetch('/api/__nft_update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'emerald-ape-042', priceEth: '1.49' }) })
```

## Estrutura e entrega

`src/api.ts` contém as chamadas Axios; `src/types.ts`, os contratos; `src/mock/handlers.ts`, os endpoints MSW; `src/mock/socket.ts` e `src/realtime.ts`, o transporte Socket.IO; `tests/`, os cenários E2E e as referências visuais. `ARCHITECTURE.md` descreve cache, sessão, idempotência e limitações.

O build usa somente arquivos locais e mocks no navegador. `VITE_MOCKS=off` desativa os mocks e exige uma API externa compatível. Os arquivos `vercel.json` e `public/_redirects` permitem refresh das rotas em Vercel e Netlify/Cloudflare Pages.

