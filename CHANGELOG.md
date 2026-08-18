# Changelog

## 0.7.9

- O clarão da chuva virou um círculo só. O estouro largo mais o véu que lavava
  a faixa de cima liam como um borrão descendo pela tela; agora é um único
  brilho redondo com gradiente, que pisca num canto do painel, no meio ou em
  um ponto qualquer entre eles, e apaga
- São sete pontos em ordem salteada, cada um com o seu diâmetro, então dois
  clarões seguidos nunca saem do mesmo lugar nem do mesmo tamanho

## 0.7.8

- Conserta o clarão da chuva, que saía com pedaços faltando: em vez de um
  brilho redondo, um retângulo cortado em linhas retas. A elipse do estouro
  era mais larga que a caixa do gradiente, então ela ainda estava acesa ao
  bater na borda e o `no-repeat` cortava ali. Agora ela cabe inteira na
  caixa e o brilho apaga sozinho, sem emenda
- O clarão também ficou mais alto e com decaimento mais macio: desce mais
  no painel e o véu de cima ganhou paradas intermediárias

## 0.7.7

- O raio da chuva virou clarão. Em vez do feixe desenhado descendo pela tela
  (que lia mais como um risco parado do que como um relâmpago), agora são só
  luzes piscando no alto do painel: um estouro concentrado mais um véu que
  lava a faixa de cima inteira, com pisca duplo e um resto de brilho depois.
  Eles continuam trocando de lugar entre um estouro e outro
- Os dois clarões são gradientes no próprio CSS — o `chuva-raio.svg` saiu do
  pacote e a animação ficou só de opacidade, sem imagem para rasterizar

## 0.7.6

- O fundo tingido de brasas estava lendo como marrom, não como brasa. Trocado
  por vermelho translúcido (RGBA de opacidade baixa por cima do tema, em vez
  do marrom sólido) na barra de título, activity bar, status bar e borda do
  painel

## 0.7.5

- Corrige a cor "piscando": a nova cor aparecia e, um instante depois,
  voltava para a antiga. A causa era falta de serialização — duas chamadas
  de aplicação concorrentes (o apply da ativação da janela ainda em voo
  quando você troca de efeito, duas trocas rápidas em seguida, ou o mesmo
  efeito mudando em duas janelas ao mesmo tempo) podiam terminar em ordem
  trocada: a mais lenta, presa a um estado mais velho, ainda vencia a
  corrida e escrevia por cima da mais rápida. Agora só uma aplicação roda
  por vez; quem chega enquanto a anterior está em voo não dispara uma
  corrida nova — só marca "pendente" e, ao terminar, roda mais uma vez
  pegando sempre a configuração mais recente

## 0.7.4

- O som ambiente lo-fi da 0.7.3 saiu: não pegou bem. Removido o motor de
  áudio inteiro (Web Audio, o arquivo `audio.json`, a configuração `som` e
  `volumeSom`, o comando "Ligar/Desligar Som") — a extensão volta a ser só
  visual, como sempre foi
- As paletas de cor mais discretas e a neve em cinza-gelo (em vez de branco)
  da 0.7.3 continuam valendo — isso não fazia parte da reclamação

## 0.7.3

- Som ambiente lo-fi, um por efeito: chuva caindo com pingos, vento em
  rajadas para a neve e uma fogueira crepitando para as brasas. Tudo
  **sintetizado na hora com Web Audio** (ruído filtrado + osciladores de
  baixa frequência modulando corte e ganho, mais estouros curtos agendados
  aleatoriamente para pingos e estalos) — nenhum arquivo de áudio embutido,
  então o pacote da extensão não engorda. Uma camada comum de "agulha de
  vinil" (ruído passa-faixa bem baixinho) dá o toque lo-fi aos três
  ambientes. Volume padrão bem baixo (`terminalAnimado.volumeSom`, 0.14) e
  um interruptor dedicado (`terminalAnimado.som`, comando "Ligar/Desligar
  Som")
- O som se apaga sozinho quando a janela perde o foco (senão, com duas
  janelas do VS Code abertas, as duas tocariam juntas) e quando o painel do
  terminal está fechado — reagindo em até 1s, sempre com um fade suave, sem
  clique. O estado do som mora num arquivo à parte do CSS de propósito:
  ficar no mesmo arquivo faria ajustar só o volume reiniciar as animações
  (o mesmo tipo de engasgo que a 0.7.1 corrigiu para o CSS)
- Paletas da interface revistas: as de chuva e brasas estavam escuras
  demais, e a de neve, branca demais (destoando de temas escuros). Agora as
  três usam tons médios e discretos — inclusive na barra de baixo — e neve
  usa cinza-gelo em vez de branco
- A varredura de resíduo de cor (0.7.2) agora também reconhece as cores da
  paleta 0.7.0–0.7.2, então quem estava com a paleta antiga aplicada sai
  limpo ao atualizar, sem precisar desligar e religar as cores na mão

## 0.7.2

- Desligar as cores (ou trocar/remover o efeito) agora limpa TUDO que é da
  extensão: além de restaurar o backup, uma varredura remove qualquer cor
  residual de qualquer paleta — desta versão ou das antigas — que tenha
  ficado para trás. Era isso que deixava a interface presa nas cores das
  brasas ao desabilitar
- A raiz do resíduo também foi corrigida: com duas janelas abertas, ambas
  aplicavam as cores ao mesmo tempo e uma podia guardar como "original" a
  cor que a outra acabara de escrever — e a restauração devolvia a paleta
  velha. Agora uma cor da extensão nunca entra no backup como original
- Brasas de volta ao visual clássico (fagulhas nítidas subindo reto, fumaça
  difusa e o brilho quente parado na base), exatamente como era antes da
  0.7.0

## 0.7.1

- Fim do "engasgo" que reiniciava a animação de tempos em tempos: o
  carregador podia ler o `atual.css` no meio de uma gravação (ou numa falha
  transitória) e aplicar CSS truncado ou vazio — o tick seguinte reaplicava o
  certo e todas as animações recomeçavam do zero. Agora a gravação é atômica
  (escreve num temporário e renomeia) e o carregador ignora leituras vazias
  ou com erro, mantendo o último CSS bom. É preciso recarregar a janela uma
  vez para o carregador novo entrar no ar
- Neve: chão só com os montes de neve em três profundidades e a cintilância —
  sem boneco de neve e sem pinheiros; cristais mais raros e discretos
- Chuva: as gotas agora respingam no rio em quatro tempos (impacto, coroa,
  anel, dissipação), com seis pontos de respingo defasados e reflexos que vão
  e voltam — e sem o barquinho de papel
- Brasas: chão redesenhado como um leito de carvão de crista irregular com
  fendas incandescentes serpenteando e luz de contorno âmbar; no ar, riscos
  de faísca com cabeça brilhante (o borrão de quem sobe depressa) no lugar
  das cruzinhas e das chamas soltas

## 0.7.0

- Animações redesenhadas para ficarem vivas de verdade:
  - **Neve**: flocos com halo de brilho, cristais de seis braços com galhos e
    estrelinhas cintilantes, caindo ao sabor do vento (vaivém suave em
    contrafase, com a queda sempre constante) — e uma terceira camada de
    flocos minúsculos ao fundo, que dá profundidade. Na neve acumulada agora
    moram pinheirinhos nevados
  - **Chuva**: pingos em diagonal com traço de gota de verdade (cabeça
    brilhante, cauda tênue), raio com clarão que ilumina as nuvens e muda de
    lugar entre um estouro e outro (dois por ciclo), e o rio ganhou
    profundidade, reflexos que deslizam e um barquinho de papel balançando
    nas ondas
  - **Brasas**: fagulhas nítidas com halo incandescente, linguinhas de fogo e
    estalos subindo com o vento; embaixo, carvões com rachaduras
    incandescentes e a braseira respirando devagar, com uma luz quente na
    base
- O custo continua o de sempre: os SVGs seguem estáticos e todo movimento
  novo (vento, diagonal, pulso, clarão) é `transform`/`opacity` — trabalho de
  composição, sem repintura. Os ciclos terminam sempre em múltiplos exatos do
  tile, então a emenda segue invisível
- Paletas da interface modernizadas, com mais contraste e acentos vivos —
  brasas em âmbar sobre carvão, neve em gelo com azul-céu, chuva em azul
  tempestade — e mais completas: borda do painel, aba ativa do terminal,
  indicador da activity bar e item remoto da status bar agora combinam com o
  efeito

## 0.6.0

- A interface agora se veste do efeito: brasas tinge barras, botões e badges
  de vermelho; neve, de cinza e branco; chuva, de azul — via
  `workbench.colorCustomizations`, só chaves de cor (nenhum tamanho ou
  layout muda), aplicado ao vivo por cima de qualquer tema
- O valor original de cada cor é guardado antes de ser sobrescrito e volta
  intacto ao escolher "Nenhum" — inclusive customizações próprias que o
  usuário já tinha, que são mescladas, não apagadas
- Nova configuração `terminalAnimado.colorirInterface` (padrão `true`) para
  quem quer a chuva no terminal sem o editor inteiro azul, com o comando
  "Terminal Animado: Ligar/Desligar Cores da Interface" no Ctrl+Shift+P

## 0.5.2

- A chuva voltou a respingar no rio: coroas de respingo e anéis que se abrem
  na água, agora como três quadros estáticos revezados por `@keyframes` na
  imagem de fundo — trocas discretas (~3 repinturas/s), sem reviver o SVG
  animado de 60 fps que a 0.2.3 removeu por custar 62% de um núcleo
- Os respingos seguem a configuração `velocidade` e ficam ligados também no
  modo `leve` — a troca discreta custa uma fração de uma camada de partículas

## 0.5.0

- Acabaram os pedidos de reload a cada troca: o bloco patchado não embute mais
  o CSS do efeito (era isso que o mudava — e reescrevia os arquivos do
  VS Code — a cada clique). Agora ele é 100% fixo; só a primeira instalação
  ou uma atualização do VS Code pedem reload, uma única vez
- O atual.css voltou para o globalStorage (raiz válida do vscode-file, com
  caminho estável): atualizar a extensão não invalida mais o patch
- Remove o bloco órfão da extensão antiga Fundo Animado no workbench.html,
  que desenhava neve sempre, ignorando o efeito "Nenhum"
- Mantém escondido o aviso de "instalação corrompida" (antes era o bloco
  órfão que escondia; agora o CSS vai no próprio atual.css)
- Carregador relê o CSS a cada 1s (antes 1,5s): troca mais imediata ao clicar

## 0.3.0

- Troca de efeito ao vivo: o patch virou um carregador fixo que relê o CSS do
  globalStorage a cada 1,5s — mudar efeito/opacidade/velocidade não pede mais
  reload (só o primeiro uso pede, uma única vez)
- Corrige trocas que não aplicavam e o "Nenhum" que mostrava efeito antigo
  (o Chromium servia patches velhos do cache)
- Os efeitos agora começam abaixo da barra de abas do painel, em vez de chover
  em cima de Problems/Output/Terminal
- Raio da chuva menor (60% da altura) e recorte reforçado no cartão do painel
- O menu "Escolher Efeito" marca a opção atual

## 0.2.3

- O rio virou desenho estático: os anéis animados dentro do SVG custavam 62% de
  um núcleo sozinhos, contra ~1% do desenho parado
- Nenhum SVG tem mais animação interna

## 0.2.2

- O patch passou a ser injetado pelo JS: o Chromium serve o CSS do workbench a
  partir do cache, então trocar ou remover o efeito não surtia efeito na tela
- Configuração `qualidade` (completo/leve) para reduzir camadas animadas
- Limpeza automática do patch antigo gravado no CSS

## 0.2.0

- Renomeada para Terminal Animado, com ícone próprio
- Boneco de neve no chão do efeito de neve

## 0.1.2

- Reaplica o CSS quando ele aponta para uma versão anterior da extensão
  (o caminho muda a cada atualização e as imagens sumiam em silêncio)

## 0.1.1

- Duas camadas animadas em vez de três: cristais de neve e fumaça passaram a
  ser desenhados dentro do tile principal, sem custo extra de render

## 0.1.0

- Reescrita da arquitetura: SVGs estáticos + `transform` no CSS, ~2,8x mais
  barato por camada e sem recalcular nada ao redimensionar o painel
- A extensão passou a aplicar o próprio CSS: acabou a dependência da extensão
  `background`
- Efeito, opacidade e velocidade viraram configurações de verdade, que vão
  junto no Settings Sync
- Reaplicação automática quando uma atualização do VS Code apaga o patch

## 0.0.2

- Chuva: rio na base com respingos, anéis na água e brilhos deslizando
- Neve: monte de neve acumulada na base, em duas camadas
- Animações ancoradas pela base, para o chão aparecer em painéis baixos

## 0.0.1

- Primeira versão: neve, chuva e brasas
