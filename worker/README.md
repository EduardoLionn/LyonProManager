# Proxy da IA (Cloudflare Worker)

`proxy-ia.js` é o código que deve rodar em `lyonpromanager.eduardolion.workers.dev`. Ele fica
fora deste repositório sendo executado — é feito o deploy manual no painel da Cloudflare (ou
via `wrangler`), então **publicar esta versão exige um passo manual seu**, não acontece
sozinho com o `git push`.

## Por que isto existia como problema

O endereço do Worker está no JavaScript público do site (`API_URL` em
`js/core-estado.js`). A versão antiga aceitava qualquer requisição, de qualquer origem, sem
prova nenhuma de quem está pedindo — ou seja, era um Gemini de graça pra qualquer pessoa que
abrisse o código-fonte do site, rodando na sua chave e na sua cota.

## O que mudou

Toda requisição agora precisa vir com `Authorization: Bearer <ID token do Firebase>`. O
Worker valida a assinatura RS256 desse token contra as chaves públicas do Google (não é só
"o header existe" — é a mesma verificação criptográfica que um servidor de verdade faria) e
confere que o token é deste projeto (`aud`/`iss`), não expirou e tem um usuário (`sub`). Só
depois disso a chave secreta do Gemini é usada.

O app já faz isso sozinho: toda chamada à IA passa por `chamarIA()` em
`js/core-utilidades.js`, que anexa o token de quem está logado automaticamente. Não precisa
mexer no app pra isto funcionar — só publicar este arquivo no Worker.

## Deploy

### Variáveis de ambiente do Worker

No painel da Cloudflare (Workers & Pages → seu Worker → Settings → Variables) ou via
`wrangler secret put`:

| Nome | Obrigatório | Para quê |
|---|---|---|
| `GEMINI_API_KEY` | sim | a chave do Gemini que já existe hoje — só muda **onde** ela mora, continua nunca aparecendo no navegador |
| `LIMITE_IA` | não | um namespace de KV do Cloudflare, se você quiser também um teto de chamadas por usuário: por minuto (20/min) e por dia (600/dia). Sem isso configurado, o Worker funciona normalmente, só sem esses limites extras — a autenticação já é a proteção principal |

O teto diário existe pra travar o pior caso (conta comprometida, script abusando da cota) sem
incomodar uso normal: uma partida completa (prints de todos os jogadores + tática + sugestões
ao vivo + relatório) fica em torno de 25 chamadas à IA, então 600/dia cobre folgado até uma
maratona de 8-10 partidas no mesmo dia, além de scout e transferências.

### Publicar

Copie o conteúdo de `proxy-ia.js` para o editor do Worker no painel da Cloudflare e clique em
Deploy — ou, se preferir `wrangler`:

```bash
cd worker
npx wrangler deploy proxy-ia.js --name lyonpromanager --compatibility-date 2026-08-01
```

(ajuste `--name` para o nome real do seu Worker, se for diferente).

## Testando antes de publicar

`tests/worker-proxy-ia.test.mjs` importa este arquivo direto e chama o handler exportado com
tokens reais assinados por um par de chaves RSA gerado na hora (sem precisar de rede nem de
credencial nenhuma) — cobre login válido, token expirado, `alg:none`, assinatura forjada,
token de outro projeto Firebase, CORS, os limites por minuto/dia do `LIMITE_IA` (com um KV
falso em memória) e confirma que a chave da API nunca aparece numa resposta.

```bash
node tests/worker-proxy-ia.test.mjs
```

Saída esperada: `25/25 verificações passaram.`
