# Kurio Marketplace

Implementação do desafio de marketplace de NFTs. O Figma foi usado **somente como referência visual**; nenhuma tela ou camada dele foi alterada.

- [Demonstração pública](https://kurio-nft-marketplace-arthur.lutoxd363951.chatgpt.site)
- [Código no GitHub](https://github.com/ArthurFuller/frontend-challenge-kurio)

## Como trabalhar neste projeto

TypeScript é JavaScript com verificação de tipos. React monta as telas a partir dos componentes em `src/`. Vite inicia um servidor local: ao salvar um arquivo, o navegador atualiza a página. Você pode usar VS Code como editor, mas ele não é obrigatório. Node.js e um navegador são suficientes.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abra **http://127.0.0.1:5173/**. Para parar o servidor, pressione `Ctrl+C` no terminal. O arquivo principal das telas é `src/router.tsx`; o visual está em `src/style.css`; a API simulada está em `src/mock/`.

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

Valores: `normal`, `slow`, `variable`, `error`, `favorite-error`, `session-expired`, `payment-declined`, `order-timeout`. `normal` restaura o comportamento padrão. Para resetar integralmente os dados, execute `await fetch('/api/__reset', {method:'POST'})` e recarregue a página.

Para simular uma mudança de preço e receber `nft.updated` via Socket.IO:

```js
await fetch('/api/__nft_update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'emerald-ape-042', priceEth: '1.49' }) })
```

## Estrutura e entrega

`src/api.ts` contém as chamadas Axios; `src/types.ts`, os contratos; `src/mock/handlers.ts`, os endpoints MSW; `src/mock/socket.ts` e `src/realtime.ts`, o transporte Socket.IO; `tests/`, os cenários E2E e as referências visuais. `ARCHITECTURE.md` descreve cache, sessão, idempotência e limitações.

O build usa somente arquivos locais e mocks no navegador. `VITE_MOCKS=off` desativa os mocks e exige uma API externa compatível. Os arquivos `vercel.json` e `public/_redirects` permitem refresh das rotas em Vercel e Netlify/Cloudflare Pages.
