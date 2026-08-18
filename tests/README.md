# Testes de segurança

Dois testes, dois pedaços da superfície que protegem dados/dinheiro do jogador. Nenhum dos
dois precisa de credencial real — ambos geram suas próprias chaves/tokens de teste.

## `firestore-regras.test.mjs` — regras do Firestore

Valida `../firestore.rules` contra o emulador oficial do Firestore. É o que garante que a
proteção dos dados dos jogadores continua de pé quando as regras mudarem — inclusive o furo
que já existiu uma vez: com escrita liberada em `usuarios/{uid}`, qualquer pessoa gravava
`assinaturaStatus = "ativa"` em si mesma e liberava o app de graça, sem passar pela Stripe.

Cobre três frentes:

- **Cobrança** — o cliente não pode escrever nada em `usuarios/{uid}` (só o Admin SDK, do
  lado do servidor, que ignora as regras por design).
- **Isolamento** — um usuário logado não lê, escreve nem lista dados de outro; sem login
  não se alcança nada; coleção não prevista fica fechada por padrão.
- **Não quebrar o app** — os fluxos legítimos continuam passando: ler o próprio cadastro,
  gravar/ler/apagar/listar os próprios saves e o webhook da Stripe liberando a assinatura.

Precisa de Java (o emulador roda na JVM). As dependências ficam fora do `package.json` de
propósito — ele é o do deploy da Vercel, e poluí-lo com dependências de teste mudaria o
build de produção.

```bash
npm i --no-save firebase @firebase/rules-unit-testing firebase-tools

# terminal 1 — sobe o emulador na porta que o teste espera
npx firebase emulators:start --only firestore --project demo-teste

# terminal 2
FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 node tests/firestore-regras.test.mjs
```

O emulador precisa estar na porta **8181** (é a porta que o teste usa). Se subir com o
`firebase.json` da raiz, adicione a seção `emulators` ou passe `--port`.

Saída esperada: `23/23 verificações passaram.`

## `worker-proxy-ia.test.mjs` — proxy da IA (Cloudflare Worker)

Importa `../worker/proxy-ia.js` direto e chama o handler exportado, com tokens reais
assinados por um par de chaves RSA gerado na hora — não precisa de rede nem de credencial
nenhuma para rodar. Cobre: acesso sem token, os ataques clássicos de JWT (`alg:none`,
assinatura forjada com outra chave, payload adulterado depois de assinado, `kid`
desconhecido), token de outro projeto Firebase, token expirado, o fluxo legítimo (token
válido → chama o Gemini exatamente uma vez), CORS por origem, e confirma que a chave secreta
do Gemini nunca aparece em nenhuma resposta.

```bash
node tests/worker-proxy-ia.test.mjs
```

Saída esperada: `18/18 verificações passaram.`
