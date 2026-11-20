# Hosken Biojoias

Loja em React + TypeScript + Vite, com Firebase Authentication, Firestore e Storage. O checkout de demonstração grava pedidos no Firestore e reserva o estoque em uma transação; pagamentos reais e cálculo de frete ainda não estão conectados. O PWA será preparado em uma etapa posterior.

## Começar sem conta Firebase

Requisitos: Node.js 22 e Java 21+. As Cloud Functions usam Node.js 22; versões diferentes podem gerar um aviso ou incompatibilidade no emulador. Nesta máquina, uma cópia local do Java foi baixada para `.tools/` (ignorada no Git). Os scripts detectam essa cópia automaticamente; em outro computador, instale Java 21+ normalmente.

```sh
npm install
npm install --prefix functions
npm run emulators
```

Mantenha esse terminal aberto. Em outro terminal:

```sh
npm run db:seed
npm run dev
```

Site: http://127.0.0.1:5173 · Painel do banco: http://127.0.0.1:4000

Acesse `/conta` com `admin@hosken.local` e senha `HoskenLocal2026!`. Essa conta é criada **exclusivamente no emulador**, não é uma conta real e não funciona em produção. Depois, abra `/admin`.

O script de seed preserva cadastros existentes. O banco exporta os dados para `.emulator-data/` ao encerrar com Ctrl+C e importa esse conteúdo na próxima execução. Não encerre o processo à força para preservar as últimas alterações. O carrinho fica no navegador; os cadastros ficam no Firestore local. Os emuladores escutam somente nesta máquina.

## O que funciona

- Páginas separadas: início, loja, produto, novidades, eventos, lojas parceiras, história, contato, conta e carrinho.
- Layout responsivo, filtros por linha e tipo cadastrados no banco.
- Login e autorização administrativa com custom claim `admin: true`.
- Clientes podem criar contas em `/conta` com nome, e-mail e senha. A página `/pedidos` mostra, em tempo real, os pedidos associados à conta, com status, itens, valores e código de rastreio.
- Cadastro e edição de produtos, preços em centavos, estoque, disponibilidade, visibilidade, materiais, medidas e cuidados.
- Upload de até seis fotos por produto pelo Firebase Storage; a página de cada peça mostra uma galeria. O emulador de Storage é iniciado junto dos demais em `npm run emulators`.
- Cadastro e edição de linhas, tipos de peça, novidades, eventos, lojas parceiras e políticas; exclusão e consulta em tempo real.
- Eventos podem incluir várias datas e horários, além de local, endereço e link de mapa. A página pública organiza os eventos pela primeira data.
- A página Políticas da loja é alimentada pelo painel administrativo. Cada texto pode ser classificado como entrega, reenvio, cancelamento, trocas e devoluções, pagamento, privacidade ou geral; o ateliê publica os textos quando estiverem prontos.
- Histórico de pedidos com leitura em tempo real, status, itens, valores e rastreio. Três registros fictícios aparecem na conta administrativa do emulador.
- Checkout de teste em duas etapas: endereço/retirada e pagamento ilustrativo por cartão ou Pix. Uma Cloud Function valida preços e estoque, cria o pedido e baixa o estoque atomicamente. A reserva só é devolvida quando o pedido de teste é cancelado antes do envio; o carrinho, sozinho, não reserva unidades.
- Cancelamento de pedidos de teste em Meus pedidos. Ao enviar o pedido, as peças ficam reservadas até cancelamento; pedidos em trânsito/concluídos deixam de ser canceláveis pelo cliente.
- Chat de texto em tempo real: clientes abrem o chat diretamente pela bolinha flutuante; a equipe acessa pela mesma bolinha ou por `/admin` → Atendimento. O painel abre primeiro em Pedidos e tem um sino com atalhos para pedidos novos e mensagens/atendimentos não lidos. Cada pessoa pode editar ou excluir somente as próprias mensagens por até uma hora. A conversa continua salva. Conversas e mensagens são privadas ao cliente e à equipe autorizada.
- WhatsApp, Instagram e e-mail da loja na página de contato.
- Logo fornecida pela família; produtos de exemplo usam ilustrações provisórias. Fotos são cadastradas por URL nesta etapa. Upload será implementado com Storage.

Produtos e preços do seed são demonstrativos. O carrinho confere disponibilidade para exibição; a Cloud Function revalida produto, preço e estoque antes de gravar o pedido. Os campos de cartão da demonstração nunca são enviados nem armazenados.

## Estrutura do banco

| Coleção                                       | Campos principais                                                                                                                                    | Acesso                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `collections`                                 | name, slug, status                                                                                                                                   | Público: publicados; admin: escrita                                                               |
| `categories`                                  | name, slug, status                                                                                                                                   | Público: publicados; admin: escrita                                                               |
| `products`                                    | name, description, priceCents, stock, categoryId, collectionId, availability, status, imageUrls, imagePaths, materials, dimensions, careInstructions | Público: publicados; admin: escrita                                                               |
| `news`, `events`, `partnerStores`, `policies` | title, body, status; eventos também têm eventSchedule (lista de data/horário), local, endereço e mapa; políticas têm policyType                      | Público: publicados; admin: escrita                                                               |
| `users`                                       | displayName                                                                                                                                          | Dono pode escrever campos permitidos; admin pode ler                                              |
| `orders`                                      | orderNumber, userId, customerName, customerEmail, items, totalCents, status, createdAt, trackingCode, reservationStatus                              | Dono pode ler; admin lê e atualiza status/rastreio; Cloud Functions cria/cancela pedidos de teste |
| `conversations/{uid}`                         | customerId, customerName, customerEmail, lastMessage, unread counters, timestamps                                                                    | Cliente dono e admin autorizado; criação pelo próprio cliente                                     |
| `conversations/{uid}/messages`                | senderId, senderRole, text, createdAt, editedAt                                                                                                      | Cliente dono e admin autorizado; autor edita/apaga por até uma hora                               |

Pedidos usam `orderNumber`, `userId`, `customerName`, `customerEmail`, `items` (cópias de nome, quantidade e preço unitário), `totalCents`, `status`, `paymentStatus`, `createdAt` e, opcionalmente, `trackingCode`. A Cloud Function cria o pedido de teste e baixa o estoque na mesma transação; a função de cancelamento devolve o estoque uma única vez. No painel, a aba Pedidos permite consultar todos e editar status/rastreio. Ao mover uma reserva de teste para envio ou conclusão, o estoque fica comprometido e o cliente não pode mais devolvê-lo cancelando. Pagamentos reais e webhooks ainda não estão conectados. O código de rastreio é preenchido manualmente com o código da transportadora. O seed cria três pedidos fictícios por conta no emulador local.

`status`: `draft` ou `published`. `availability`: `available`, `soldout`, `prelaunch`, `made-to-order`. Estoque e preço devem ser inteiros não negativos. Documentos referenciados de linha e tipo devem existir. Nesta base, evite excluir linhas e tipos usados em produtos; prefira mantê-los em rascunho até implementarmos arquivamento e validação de dependências no backend.

Push para a tela bloqueada/central de notificações, pagamentos reais e cálculo automático de frete ainda não estão habilitados. O contador de não lidas funciona enquanto a aplicação está aberta; push em segundo plano exige PWA, permissão do dispositivo e Firebase Cloud Messaging. As regras negam por padrão as coleções não implementadas. Senhas são gerenciadas pelo Authentication, nunca armazenadas no Firestore. O fluxo de demonstração é protegido por uma lista de e-mails autorizados e deve continuar restrito enquanto usar aprovação simulada.

## Verificação

```sh
npm run build
npm run test:rules
```

Para repetir a verificação do navegador, com emuladores, seed e site já em execução:

```sh
npx playwright install chromium
npm run test:browser
```

Verifica navegação, filtros, carrinho persistente, login, cadastro e exclusão de uma novidade temporária, além de ausência de rolagem horizontal nas larguras 320, 390, 768, 1024 e 1440 px. Capturas ficam em `.artifacts/`, fora do Git. É um teste local e não deve ser executado apontando para produção.

Os testes usam um Firestore temporário no projeto `demo-hosken`, sem login Google. Pare o emulador de desenvolvimento antes dos testes para liberar a porta 8080. Eles verificam catálogo público, rascunhos privados, autorização administrativa, validação de preço/estoque, isolamento dos pedidos e impossibilidade de promover a própria conta. Não usam os dados persistidos do desenvolvimento.

## Conectar ao Firebase real depois

1. Criar um projeto, registrar um app web e habilitar Authentication com e-mail/senha e Firestore.
2. Copiar `.env.example` para `.env.local`, preencher os dados reais e definir `VITE_USE_EMULATORS=false`.
3. Criar sua conta real. Atribuir `admin: true` ao seu UID via Admin SDK em um ambiente confiável. Nenhum cliente pode atribuir essa permissão. Não reutilizar a senha local.
4. Revisar e publicar `firestore.rules` e índices no projeto real, explicitando `--project SEU_PROJECT_ID`. O projeto padrão continua sendo `demo-hosken` para evitar ações acidentais.
5. Migrar os cadastros reais com script controlado. O seed é deliberadamente limitado aos emuladores e não faz essa migração.
6. Habilitar Firebase Storage, configurar `VITE_FIREBASE_STORAGE_BUCKET` e publicar também `storage.rules`.
7. Para ativar o checkout online, o projeto precisa do plano Blaze para implantar Cloud Functions. Copie `functions/.env.example` para `functions/.env.hosken-biojoias`, informe as contas de teste autorizadas e implante `firebase deploy --only functions` usando o projeto correto. Sem isso, o checkout online não grava pedidos nem altera estoque.

O projeto real começa separado do banco local. Nunca colocar chaves do Admin SDK, tokens ou contas de serviço no frontend/Git. Os identificadores públicos de configuração web não substituem regras de autorização.

## Prévia pública no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente a prévia a cada push na branch `main`. Na primeira configuração do repositório, selecione **GitHub Actions** em **Settings → Pages → Build and deployment → Source**. O endereço esperado é `https://brunahosken.github.io/hosken-biojoias-site/`.

A página usa o Firebase real configurado nas variables/secrets do GitHub. O checkout de demonstração só funciona online depois de implantar as Cloud Functions e configurar a lista de contas de teste; antes disso, não cria pedidos nem baixa estoque. Não informar dados reais de cartão. O domínio próprio será configurado depois.

## Dependências

Na verificação inicial, os avisos altos/críticos foram corrigidos atualizando ferramentas e aplicando override compatível do gRPC. Restam 13 alertas moderados transitivos nas ferramentas de desenvolvimento do Firebase. Revisar atualizações antes do lançamento; não aplicar `npm audit fix --force` indiscriminadamente, pois ele sugere rebaixar versões principais. O fluxo de CI verifica compilação e regras, mas não representa uma auditoria completa de segurança.
