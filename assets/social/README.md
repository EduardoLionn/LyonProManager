# Capas do Feed Social

Cada categoria de post do Feed Social tenta carregar uma foto de verdade a partir de um arquivo
nesta pasta, com o nome exato abaixo (extensão `.jpg`). Se o arquivo não existir aqui, o app usa
automaticamente uma foto de banco livre; se as duas falharem, cai no gradiente + emoji. Ver
`js/feed-social.js` (`CATEGORIAS_POST_SOCIAL`).

Pra usar sua própria foto numa categoria, basta subir o arquivo com esse nome nesta pasta —
não precisa mexer em nenhum código.

| Arquivo esperado          | Categoria                                  |
| -------------------------- | ------------------------------------------ |
| `vitoria.jpg`               | Vitória em partida                         |
| `campeao.jpg`                | Conquista de título                        |
| `derrota.jpg`                | Derrota em partida                         |
| `empate.jpg`                 | Empate em partida                          |
| `contratacao.jpg`            | Reforço/renovação de contrato              |
| `venda.jpg`                  | Saída/venda/fim de empréstimo de jogador   |
| `lesao.jpg`                  | Lesão / Departamento Médico                |
| `capitao.jpg`                 | Braçadeira / vestiário                     |
| `financeiro.jpg`              | Bastidores financeiros da diretoria        |
| `corneta.jpg`                 | Repercussão/pressão da torcida             |
| `geral.jpg`                   | Qualquer outra notícia                     |
