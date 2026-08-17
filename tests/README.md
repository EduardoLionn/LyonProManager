# Testes das regras de segurança do Firestore

`firestore-regras.test.mjs` valida `../firestore.rules` contra o emulador oficial do
Firestore. É o que garante que a proteção dos dados dos jogadores continua de pé quando
as regras mudarem — inclusive o furo que já existiu uma vez: com escrita liberada em
`usuarios/{uid}`, qualquer pessoa gravava `assinaturaStatus = "ativa"` em si mesma e
liberava o app de graça, sem passar pela Stripe.

O teste cobre três frentes:

- **Cobrança** — o cliente não pode escrever nada em `usuarios/{uid}` (só o Admin SDK, do
  lado do servidor, que ignora as regras por design).
- **Isolamento** — um usuário logado não lê, escreve nem lista dados de outro; sem login
  não se alcança nada; coleção não prevista fica fechada por padrão.
- **Não quebrar o app** — os fluxos legítimos continuam passando: ler o próprio cadastro,
  gravar/ler/apagar/listar os próprios saves e o webhook da Stripe liberando a assinatura.

## Como rodar

Precisa de Java (o emulador roda na JVM). As dependências ficam fora do `package.json` de
propósito — ele é o do deploy da Vercel, e poluí-lo com dependências de teste mudaria o
build de produção.

```bash
# num diretório separado, ou aceite o node_modules temporário aqui
npm i --no-save firebase @firebase/rules-unit-testing firebase-tools

# terminal 1 — sobe o emulador na porta que o teste espera
npx firebase emulators:start --only firestore --project demo-teste

# terminal 2
FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 node tests/firestore-regras.test.mjs
```

O emulador precisa estar configurado na porta **8181** (é a porta que o teste usa). Se
subir com o `firebase.json` da raiz, adicione a seção `emulators` ou passe `--port`.

Saída esperada: `23/23 verificações passaram.` — sai com código 1 se qualquer uma falhar.
