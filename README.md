# Terminal Animado

Fundos animados para o painel do VS Code — sem transformar o editor em aquecedor.

| Efeito | O que tem | Cores da interface |
|---|---|---|
| ❄️ Neve | Flocos com brilho em três profundidades caindo ao sabor do vento, cristais e neve acumulada embaixo | Cinza-gelo |
| 🌧️ Chuva | Chuva em diagonal com traço de gota, raios com clarão que mudam de lugar e gotas respingando no rio em quatro tempos | Azul acinzentado |
| 🔥 Brasas | Fagulhas subindo, fumaça difusa e o brilho da braseira embaixo | Âmbar acinzentado |

## Como usar

`Ctrl+Shift+P` → **Terminal Animado: Escolher Efeito** → recarregue a janela.

Para tirar: **Terminal Animado: Remover Efeito**.

Para ligar ou desligar só as cores da interface, mantendo a animação:
**Terminal Animado: Ligar/Desligar Cores da Interface**.

## Configurações

| Chave | Padrão | O que faz |
|---|---|---|
| `terminalAnimado.efeito` | `nenhum` | `neve`, `chuva`, `brasas` ou `nenhum` |
| `terminalAnimado.opacidade` | `0.5` | De `0.05` (fantasma) a `1` (cheio) |
| `terminalAnimado.velocidade` | `1` | Multiplicador — `0.5` é lento, `2` é rápido |
| `terminalAnimado.colorirInterface` | `true` | Tinge barras, botões e badges na cor do efeito |

## Cores da interface

Com um efeito ativo, a extensão tinge a interface para combinar — em tons
médios e discretos de propósito, para sugerir o efeito sem gritar em cima de
nenhum tema: brasas em âmbar acinzentado, neve em cinza-gelo (nunca branco
puro), chuva em azul acinzentado. Isso é feito pelo
`workbench.colorCustomizations` (a API oficial de cores), então funciona por
cima de qualquer tema e **só mexe em cor**: nenhum tamanho, fonte ou layout
muda.

O valor original de cada cor é guardado antes de ser sobrescrito. Ao escolher
"Nenhum" (ou desligar `colorirInterface`), a sua configuração volta exatamente
como era. Se for desinstalar a extensão com um efeito ativo, remova o efeito
antes — desinstalada, ela não tem como rodar a restauração.

## Por que é leve

A primeira versão animava dentro do SVG. Parece a escolha óbvia, mas quando um
SVG é usado como imagem de fundo, o navegador **redesenha a imagem inteira a
cada quadro** — e o custo não vem da quantidade de partículas, vem do simples
fato de existir animação. Medido no Chromium (headless, render por software,
painel de 1500x350 — números altos por não ter GPU, mas comparáveis entre si):

| O que está na tela | Custo |
|---|---|
| Página vazia | 1,0% de um núcleo |
| Camada estática, sem animação | 1,1% |
| Chão da neve (estático) | 1,3% |
| Rio com anéis animados dentro do SVG | 62,3% |
| Camada movida por `transform` no CSS | ~23% |

Daí as duas decisões da arquitetura: **nenhum SVG tem animação dentro** (todos
são estáticos, rasterizados uma vez) e o movimento vem de `transform` no CSS,
que é trabalho de composição — barato de verdade quando há GPU, que é o caso do
VS Code de verdade. Desenhos parados (neve acumulada, brasa) saem de graça.

Os respingos da chuva no rio são quatro quadros estáticos revezados por
`@keyframes` na imagem de fundo (impacto, coroa, anel, dissipação): cada troca
é discreta (~2,5 repinturas por segundo na faixa do rio), nada a ver com os
60 quadros por segundo da animação interna que a tabela acima aposentou —
barato o bastante para ficar ligado até no modo `leve`.

Os tiles têm emenda invisível: quem cruza a borda é duplicado do outro lado, e
todo ciclo termina num deslocamento múltiplo exato do tile — a altura no eixo
vertical e, no horizontal, a largura exata (queda diagonal da chuva) ou zero
(o vaivém de vento da neve vai e volta). O vento e o clarão do raio também são
só `transform` e `opacity` — composição, sem repintura. Como o
`background-size` é fixo em pixels, redimensionar o painel não rasteriza nada
de novo.

Se ainda pesar na sua máquina, `terminalAnimado.qualidade: "leve"` deixa uma
camada animada só — cerca de metade do custo.

## Como funciona por dentro

O VS Code não deixa extensão injetar CSS no workbench, então a extensão
acrescenta um bloco delimitado por marcadores no
`workbench.desktop.main.css` da instalação. Consequências:

- Na primeira vez o VS Code avisa que **a instalação parece corrompida** — é
  esperado; dispense o aviso.
- É preciso ter permissão de escrita na pasta do VS Code. Sem ela, a extensão
  mostra o comando `chown` a ser executado.
- Toda atualização do VS Code apaga o bloco; a extensão detecta e reaplica
  sozinha na inicialização seguinte.

## Licença

MIT
