# Changelog

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
