# Arquitetura e decisões

## Contratos REST

Todas as chamadas da interface usam Axios com prefixo `/api`; o MSW intercepta essa camada. `401` indica sessão inválida, `404` recurso ausente, `409` conflito e `422` formulário ou cupom inválido. Erros transitórios usam `503`.

| Recurso | Operações |
| --- | --- |
| Sessão | `GET /session`, `POST /login`, `POST /signup`, `POST /logout` |
| NFTs | `GET /nfts` com `search`, `category`, `min`, `max`, `sort`, `page`; `GET /nfts/:id` |
| Favoritos | `GET /favorites`, `PUT/DELETE /favorites/:id` |
| Carrinho | `GET /cart`, `PUT /cart` com `{nftId, quantity}` |
| Cotação | `POST /quote` com `{coupon, network}` |
| Pedidos | `POST /orders` com cabeçalho `Idempotency-Key`; `GET /orders/:id`, `GET /orders/by-key/:key` |
| Perfil | `PATCH /profile`, `PATCH /password` |
| Carteiras | `GET /wallets`, `POST /wallets`; `GET/POST/DELETE /wallet/connection` |

O preço ETH viaja como string decimal. `decimal.js` calcula subtotal, desconto, taxa e total. A cotação inclui `fingerprint` dos itens, versões, quantidades e valores. `POST /orders` recalcula tudo: se o fingerprint mudou, retorna `409` e exige revisão. A mesma chave de idempotência retorna o mesmo pedido; conteúdo diferente com a mesma chave retorna conflito. O recibo conserva um snapshot da cotação.

## Sessão e estado

O token fictício é salvo em `localStorage` para refresh. Os registros do mock também usam `localStorage`, por usuário. O visitante tem um carrinho próprio, que é incorporado ao entrar. Logout e `401` limpam o cache TanStack Query para impedir mistura de dados privados. A senha não é gravada em texto puro. Não existe servidor de autenticação real.

As chaves Query incluem parâmetros do catálogo ou ID do usuário. Consultas têm `staleTime` de 15 s, um retry e atualização ao voltar à aba. O `signal` cancela listagens obsoletas. Mutations não têm retry automático. Favoritos usam atualização otimista com rollback. Mutations de carrinho e perfil invalidam suas consultas relacionadas.

## Tempo real

`socket.io-client` abre WebSocket em `/socket.io/`, interceptado pelo MSW com `@mswjs/socket.io-binding`. Os eventos `nft.updated` e `order.updated` carregam ID, versão e recurso. O cliente ignora versões duplicadas/antigas e eventos de pedido de outro usuário. Na conexão ou reconexão, invalida catálogo, carrinho, cotação e pedido ativo para reconciliar com REST. O listener é desligado ao trocar de sessão ou desmontar o componente.

O binding publicado suporta o namespace padrão e eventos de texto. A simulação é local ao navegador; não sincroniza abas ou dispositivos distintos. Pedidos pendentes são recuperados pela API após refresh, e a chave da tentativa permanece em `sessionStorage` até o estado do pedido ser localizado.

## Interface e assets

O layout toma o Figma como referência: fundo `#140D0A`, tipografia monoespaçada, acentos cobre/dourado, cards e formulários escuros. Os quatro PNGs em `public/images` foram extraídos dos frames exportados do Figma em resolução maior. Alguns NFTs reutilizam a mesma arte, como ocorre no frame; as demais variações ainda dependem de exportar camadas individuais. O arquivo Figma não foi modificado. O diálogo Radix segue o padrão de shadcn/ui para foco e teclado; há foco visível, labels, estados de erro e respeito a movimento reduzido.

## Limites conhecidos

- A conexão, desconexão e recusa de carteira são simuladas por endpoints MSW; não há extensão de carteira real.
- O mock persiste apenas neste navegador. Não representa múltiplos clientes conectados a um backend comum.
- Avatar usa arquivo local de até 1 MB, convertido em data URL e persistido no mock do navegador.
- Alguns frames editoriais do Figma e links fora do escopo não foram implementados como páginas.
- A revisão visual atual ainda precisa de comparação manual por frame e de novos baselines Playwright; os baselines versionados refletem a versão anterior.
- `reports/summary.json` registra as medições Lighthouse e qualquer resultado abaixo das metas deve ser avaliado junto dos relatórios individuais.

## Lighthouse da versão anterior

Medianas de três execuções por página e perfil no build otimizado anterior, em Chromium local com mocks ativos. Não representam a revisão visual atual:

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 93 | 98 | 96 | 92 | 3,21 s | 0 | 87 ms |
| Início | Desktop | 99 | 100 | 96 | 92 | 0,76 s | 0 | 45 ms |
| Detalhe | Mobile | 94 | 100 | 96 | 92 | 3,05 s | 0 | 62 ms |
| Detalhe | Desktop | 83 | 100 | 96 | 92 | 3,05 s | 0,01 | 54 ms |

O detalhe desktop ficou abaixo da meta de performance 90. O LCP de cerca de 3 s é o maior fator: a imagem principal aparece após inicialização do MSW e consulta do detalhe. O código inicial também inclui Router, Query e mocks, o que aumenta o trabalho de carregamento. O skeleton com dimensões reservadas eliminou o deslocamento grande de layout observado na primeira auditoria. Os relatórios HTML e JSON em `reports/` preservam o ambiente e as evidências de cada rodada.

