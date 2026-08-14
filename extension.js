const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const MARCA_INICIO = '/* terminal-animado:inicio */';
const MARCA_FIM = '/* terminal-animado:fim */';

const PAINEL = '.monaco-workbench .split-view-view > .part.panel';
const CONTEUDO = PAINEL + ' > .content';
// altura da barra de abas do painel (Problems/Output/Terminal): os efeitos
// começam abaixo dela, para não chover em cima das abas
const TITULO = 35;

const EFEITOS = {
    neve: { rotulo: '❄️  Neve', detalhe: 'Flocos com brilho caindo ao sabor do vento' },
    chuva: { rotulo: '🌧️  Chuva', detalhe: 'Chuva em diagonal, raios e respingos no rio' },
    brasas: { rotulo: '🔥  Brasas', detalhe: 'Fagulhas subindo, fumaça e brasa acesa' }
};

// ─── Cores da interface ──────────────────────────────────────────────────────
// Tinge a interface para combinar com o efeito, via workbench.colorCustomizations
// (API oficial: aplica ao vivo, por cima de qualquer tema, e remover restaura o
// tema exato). Só chaves de COR — nada de tamanho, fonte ou layout. O valor
// original de cada chave é guardado no globalState na primeira vez que ela é
// tocada e devolvido quando ela sai de cena, então a configuração do usuário
// volta intacta ao remover o efeito ou desligar `colorirInterface`.

const CHAVE_BACKUP = 'coresOriginais';

// Tons médios e dessaturados de propósito: escuro demais (as versões
// anteriores de chuva e brasas) pesa a interface inteira, e branco puro (a
// neve original) destoa de qualquer tema escuro. A meta é "disfarçado" — a
// cor sugere o efeito sem gritar, inclusive na barra de baixo.
const PALETAS = {
    brasas: {
        'titleBar.activeBackground': '#3d2a20',
        'titleBar.activeForeground': '#f3ddc9',
        'titleBar.inactiveBackground': '#332019',
        'titleBar.inactiveForeground': '#a8836f',
        'activityBar.background': '#3a2519',
        'activityBar.foreground': '#e8bb96',
        'activityBar.inactiveForeground': '#93705a',
        'activityBar.activeBorder': '#d97b45',
        'activityBarBadge.background': '#c96a35',
        'activityBarBadge.foreground': '#ffffff',
        'statusBar.background': '#4a3125',
        'statusBar.foreground': '#eeddce',
        'statusBarItem.remoteBackground': '#a85a2e',
        'statusBarItem.remoteForeground': '#ffffff',
        'button.background': '#b8622f',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#c96a35',
        'badge.background': '#b8622f',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#e0975c',
        'focusBorder': '#d97b45',
        'panelTitle.activeBorder': '#d97b45',
        'panel.border': '#4d3527',
        'terminal.tab.activeBorder': '#d97b45'
    },
    neve: {
        'titleBar.activeBackground': '#3c4046',
        'titleBar.activeForeground': '#e4e7ea',
        'titleBar.inactiveBackground': '#33363b',
        'titleBar.inactiveForeground': '#8b929a',
        'activityBar.background': '#383c42',
        'activityBar.foreground': '#dde1e5',
        'activityBar.inactiveForeground': '#828990',
        'activityBar.activeBorder': '#8ab0cc',
        'activityBarBadge.background': '#5e8caa',
        'activityBarBadge.foreground': '#ffffff',
        'statusBar.background': '#454a50',
        'statusBar.foreground': '#dde1e5',
        'statusBarItem.remoteBackground': '#4d7691',
        'statusBarItem.remoteForeground': '#ffffff',
        'button.background': '#4d7691',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#5e8caa',
        'badge.background': '#4d7691',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#8ab0cc',
        'focusBorder': '#8ab0cc',
        'panelTitle.activeBorder': '#8ab0cc',
        'panel.border': '#494d53',
        'terminal.tab.activeBorder': '#8ab0cc'
    },
    chuva: {
        'titleBar.activeBackground': '#213445',
        'titleBar.activeForeground': '#d3e6f5',
        'titleBar.inactiveBackground': '#1b2b39',
        'titleBar.inactiveForeground': '#7691a8',
        'activityBar.background': '#1f313f',
        'activityBar.foreground': '#b0d2ea',
        'activityBar.inactiveForeground': '#6a8ba1',
        'activityBar.activeBorder': '#5fa3d0',
        'activityBarBadge.background': '#4088ba',
        'activityBarBadge.foreground': '#ffffff',
        'statusBar.background': '#2a4256',
        'statusBar.foreground': '#dcecf7',
        'statusBarItem.remoteBackground': '#3878a3',
        'statusBarItem.remoteForeground': '#ffffff',
        'button.background': '#3878a3',
        'button.foreground': '#ffffff',
        'button.hoverBackground': '#4088ba',
        'badge.background': '#3878a3',
        'badge.foreground': '#ffffff',
        'progressBar.background': '#71b3dd',
        'focusBorder': '#5fa3d0',
        'panelTitle.activeBorder': '#5fa3d0',
        'panel.border': '#2c4457',
        'terminal.tab.activeBorder': '#5fa3d0'
    }
};

// Cores das paletas de versões antigas, por chave: fazem parte do conjunto
// "reconhecidamente nosso" para a varredura de resíduo abaixo conseguir
// limpar sobras de qualquer época — inclusive a paleta 0.7.0–0.7.2 (escura
// demais em brasas/chuva, branca em neve) que esta versão substitui. Cada
// lista segue [0.6.0, 0.7.0–0.7.2] com brasas/neve/chuva em sequência.
const CORES_LEGADAS = {
    'titleBar.activeBackground': ['#5a1412', '#e8edf3', '#10304d', '#331008', '#eef3f9', '#0c1f33'],
    'titleBar.activeForeground': ['#ffe3d9', '#3b4552', '#d3e7f8', '#ffe8d6', '#2e3a48', '#d6eafc'],
    'titleBar.inactiveBackground': ['#401210', '#d5dce5', '#0c2237', '#220b06', '#dde5ee', '#081522'],
    'titleBar.inactiveForeground': ['#c9968a', '#7d8794', '#7fa2c0', '#b07a63', '#8494a7', '#6d8cab'],
    'activityBar.background': ['#451311', '#dde4ec', '#0d2941', '#2a0e07', '#e3eaf2', '#0a1a2b'],
    'activityBar.foreground': ['#ffcdbd', '#3b4552', '#a4cdef', '#ffb289', '#2e3a48', '#9ccdf5'],
    'activityBar.inactiveForeground': ['#a5675c', '#8d97a5', '#5c81a3', '#8f5a44', '#93a2b4', '#4f7396'],
    'activityBar.activeBorder': ['#ff7a29', '#0ea5e9', '#38bdf8'],
    'activityBarBadge.background': ['#f05e1c', '#6d87a8', '#2f86cc', '#ff6d1f', '#0ea5e9', '#1d9bf0'],
    'activityBarBadge.foreground': ['#ffffff'],
    'statusBar.background': ['#7f1d1d', '#cdd7e2', '#155081', '#5c1a09', '#d7e1ec', '#103a5e'],
    'statusBar.foreground': ['#ffe3d9', '#3b4552', '#dcecfa', '#ffddc2', '#2e3a48', '#dcefff'],
    'statusBarItem.remoteBackground': ['#c2410c', '#0284c7', '#1272c4'],
    'statusBarItem.remoteForeground': ['#ffffff'],
    'button.background': ['#c2410c', '#7c92ac', '#1f6db5', '#ea580c', '#0284c7', '#1272c4'],
    'button.foreground': ['#ffffff'],
    'button.hoverBackground': ['#ea580c', '#8fa4bc', '#2f86cc', '#ff6d1f', '#0ea5e9', '#1d9bf0'],
    'badge.background': ['#c2410c', '#7c92ac', '#1f6db5', '#ea580c', '#0ea5e9', '#1d9bf0'],
    'badge.foreground': ['#ffffff'],
    'progressBar.background': ['#fb923c', '#9fb3c8', '#3b96e0', '#ff9f43', '#38bdf8', '#4db2ff'],
    'focusBorder': ['#f97316', '#9fb3c8', '#3b96e0', '#ff8c42', '#7dd3fc', '#4db2ff'],
    'panelTitle.activeBorder': ['#fb923c', '#9fb3c8', '#3b96e0', '#ff8c42', '#38bdf8', '#4db2ff'],
    'panel.border': ['#7c2d12', '#c3d0de', '#17466e'],
    'terminal.tab.activeBorder': ['#ff8c42', '#38bdf8', '#4db2ff']
};

// Tudo que a extensão já escreveu algum dia, como "chave=cor": é o que separa
// resíduo nosso de customização legítima do usuário.
const CORES_NOSSAS = (() => {
    const conjunto = new Set();
    for (const paleta of Object.values(PALETAS)) {
        for (const [chave, cor] of Object.entries(paleta)) {
            conjunto.add(`${chave}=${cor.toLowerCase()}`);
        }
    }
    for (const [chave, cores] of Object.entries(CORES_LEGADAS)) {
        for (const cor of cores) conjunto.add(`${chave}=${cor}`);
    }
    return conjunto;
})();

const CHAVES_NOSSAS = (() => {
    const conjunto = new Set(Object.keys(CORES_LEGADAS));
    for (const paleta of Object.values(PALETAS)) {
        for (const chave of Object.keys(paleta)) conjunto.add(chave);
    }
    return conjunto;
})();

function ehCorNossa(chave, valor) {
    return typeof valor === 'string'
        && CORES_NOSSAS.has(`${chave}=${valor.toLowerCase()}`);
}

/**
 * Leva o colorCustomizations global até a paleta pedida ({} = restaurar tudo):
 * chaves que saem de cena voltam ao valor original (null = não existia) e cada
 * chave nova é salva no backup antes de ser sobrescrita. Trocar neve→chuva não
 * regrava o backup — ele sempre guarda o valor de ANTES do primeiro toque.
 *
 * Duas defesas contra resíduo (interface presa na cor de um efeito antigo):
 * uma cor NOSSA nunca entra no backup como "original" — com duas janelas
 * abertas, as duas aplicam ao mesmo tempo e uma podia guardar como original a
 * cor que a outra tinha acabado de escrever, e restaurar isso devolvia a
 * paleta velha — e toda aplicação varre as chaves que já foram nossas e
 * remove qualquer valor reconhecidamente nosso fora da paleta atual, mesmo
 * sem backup.
 */
async function aplicarCores(context, paleta) {
    const cfg = vscode.workspace.getConfiguration('workbench');
    const atual = { ...(cfg.inspect('colorCustomizations')?.globalValue || {}) };
    const originais = { ...(context.globalState.get(CHAVE_BACKUP) || {}) };
    const antesAtual = JSON.stringify(atual);
    const antesOriginais = JSON.stringify(originais);

    for (const chave of Object.keys(originais)) {
        if (chave in paleta) continue;
        if (originais[chave] === null || ehCorNossa(chave, originais[chave])) {
            delete atual[chave];
        } else {
            atual[chave] = originais[chave];
        }
        delete originais[chave];
    }
    // varredura de resíduo: limpa o que é nosso e ficou órfão de backup
    for (const chave of CHAVES_NOSSAS) {
        if (!(chave in paleta) && ehCorNossa(chave, atual[chave])) {
            delete atual[chave];
        }
    }
    for (const [chave, cor] of Object.entries(paleta)) {
        if (!(chave in originais)) {
            originais[chave] = chave in atual && !ehCorNossa(chave, atual[chave])
                ? atual[chave] : null;
        }
        atual[chave] = cor;
    }

    try {
        if (JSON.stringify(atual) !== antesAtual) {
            await cfg.update('colorCustomizations',
                Object.keys(atual).length ? atual : undefined,
                vscode.ConfigurationTarget.Global);
        }
        if (JSON.stringify(originais) !== antesOriginais) {
            await context.globalState.update(CHAVE_BACKUP,
                Object.keys(originais).length ? originais : undefined);
        }
    } catch (_) {
        // settings.json indisponível: a próxima troca de efeito tenta de novo
    }
}

/** O sandbox do VS Code bloqueia file://; arquivos locais usam vscode-file://. */
function urlDe(context, arquivo) {
    return `vscode-file://vscode-app${path.join(context.extensionPath, 'media', arquivo)}`;
}

/**
 * Camada de partículas: o SVG é estático (rasterizado uma vez) e quem se mexe
 * é a camada inteira, via transform — trabalho de composição, sem redesenho.
 * A emenda nunca aparece porque todo ciclo termina num deslocamento múltiplo
 * do tile: a altura exata no eixo Y e, no X, ou a largura exata (queda em
 * `diagonal`, para a chuva) ou zero (o `balanco` de vento da neve e das
 * brasas vai e volta, com folga lateral para o recorte não expor a borda).
 */
function camada(seletor, url, larg, alt, dur, opacidade, nome, opts = {}) {
    const { subindo = false, diagonal = false, balanco = 0, fase = 1, z = 1000 } = opts;
    const alvoY = subindo ? -alt : alt;
    const dx = diagonal ? -larg : 0;
    // camada presa abaixo da barra de abas, com uma folga do tamanho do tile
    // na direção do movimento (recortada pelo overflow:hidden do painel)
    const topo = subindo ? `${TITULO}px` : `calc(${TITULO}px - ${alt}px)`;
    const esq = balanco ? balanco + 6 : 0;
    const dir = balanco ? balanco + 6 : -dx;

    let quadros;
    if (balanco) {
        // vaivém de vento: o X percorre uma senoide amostrada e o Y avança
        // linear em TODOS os quadros — qualquer easing aqui seguraria a
        // queda junto com o balanço e a animação pareceria estancar
        const N = 8, arred = (v) => Math.round(v * 10) / 10;
        const passos = [];
        for (let k = 0; k <= N; k++) {
            const x = arred(fase * balanco * Math.sin(2 * Math.PI * k / N));
            const y = arred(alvoY * k / N);
            passos.push(`    ${arred(k * 100 / N)}% { transform: translate(${x}px, ${y}px); }`);
        }
        quadros = `\n@keyframes ${nome} {\n${passos.join('\n')}\n}`;
    } else {
        quadros = `
@keyframes ${nome} {
    from { transform: translate(0, 0); }
    to { transform: translate(${dx}px, ${alvoY}px); }
}`;
    }

    return `
${seletor} {
    content: '';
    position: absolute;
    left: ${-esq}px; right: ${-dir}px;
    top: ${topo};
    height: calc(100% - ${TITULO}px + ${alt}px);
    pointer-events: none;
    z-index: ${z};
    background-image: url("${url}");
    background-repeat: repeat;
    background-size: ${larg}px ${alt}px;
    opacity: ${opacidade};
    will-change: transform;
    animation: ${nome} ${dur}s linear infinite;
}${quadros}`;
}

/** Camada parada, ancorada na base: chão de neve, rio, brasa. */
function chao(url, altura, opacidade) {
    return `
${PAINEL}::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    background-image: url("${url}");
    background-repeat: repeat-x;
    background-position: center bottom;
    background-size: auto ${altura}px;
    opacity: ${opacidade};
}`;
}

function cssDoEfeito(context, efeito, opacidade, velocidade, qualidade) {
    const u = (arq) => urlDe(context, arq);
    const v = (segundos) => (segundos / velocidade).toFixed(1);
    const o = (mult) => Math.min(1, opacidade * mult).toFixed(2);
    // no modo leve ficam só a camada de trás e o chão: o resto é enfeite
    const completo = qualidade !== 'leve';
    // o .part.panel não tem position no CSS do VS Code: sem isto, as camadas
    // ancoram no workbench inteiro e vazam para fora do terminal
    const clip = `\n${PAINEL} { position: relative !important; overflow: hidden !important; }`;

    if (efeito === 'neve') {
        return clip + [
            chao(u('neve-chao.svg'), 90, opacidade),
            camada(`${PAINEL}::after`, u('neve-a.svg'), 640, 360, v(24),
                opacidade, 'ta_neve_lenta', { balanco: 22 }),
            completo && camada(`${CONTEUDO}::after`, u('neve-b.svg'), 420, 250,
                v(13), opacidade * 0.8, 'ta_neve_rapida', { balanco: 14, fase: -1 }),
            // flocos minúsculos bem lentos ao fundo dão a profundidade
            completo && camada(`${CONTEUDO}::before`, u('neve-c.svg'), 360, 220,
                v(38), opacidade * 0.55, 'ta_neve_fundo', { balanco: 10, z: 999 })
        ].filter(Boolean).join('\n');
    }

    if (efeito === 'chuva') {
        // os respingos no rio são 4 quadros PARADOS trocados por keyframe
        // (impacto → coroa → anel → dissipação; ~2,5 repinturas/s, barato até
        // para o modo leve): animação interna no SVG re-rasteriza a 60 fps e
        // chegou a custar 62% de um núcleo (removida na 0.2.3)
        const respingos = `
${PAINEL}::before { animation: ta_respingos ${v(1.6)}s infinite; }
@keyframes ta_respingos {
    0%, 24% { background-image: url("${u('chuva-chao-a.svg')}"); }
    25%, 49% { background-image: url("${u('chuva-chao-b.svg')}"); }
    50%, 74% { background-image: url("${u('chuva-chao-c.svg')}"); }
    75%, 100% { background-image: url("${u('chuva-chao-d.svg')}"); }
}`;
        return clip + [
            chao(u('chuva-chao-a.svg'), 96, opacidade) + respingos,
            camada(`${PAINEL}::after`, u('chuva-a.svg'), 160, 520, v(2.7),
                opacidade, 'ta_chuva_grossa', { diagonal: true }),
            completo && camada(`${CONTEUDO}::after`, u('chuva-b.svg'), 140, 460,
                v(3.4), opacidade * 0.8, 'ta_chuva_fina', { diagonal: true }),
            // o raio é uma imagem parada (feixe + clarão no céu); o susto vem
            // da opacidade, que é barata, e ele muda de lugar entre um estouro
            // e outro com a camada invisível — uma repintura por ciclo
            `
${CONTEUDO}::before {
    content: '';
    position: absolute;
    left: 0; right: 0;
    top: ${TITULO}px;
    height: calc(100% - ${TITULO}px);
    pointer-events: none;
    z-index: 1000;
    background-image: url("${u('chuva-raio.svg')}");
    background-repeat: no-repeat;
    background-size: auto 62%;
    opacity: 0;
    animation: ta_raio ${v(13)}s linear infinite;
}
@keyframes ta_raio {
    0% { opacity: 0; background-position: 24% top; }
    38% { opacity: 0; }
    39% { opacity: ${o(1.7)}; }
    40.2% { opacity: 0.05; }
    41.5% { opacity: ${o(1.2)}; }
    43.5% { opacity: 0; }
    64% { opacity: 0; background-position: 24% top; }
    64.3% { background-position: 72% top; }
    87% { opacity: 0; }
    88% { opacity: ${o(1.6)}; }
    89.3% { opacity: 0.04; }
    90.6% { opacity: ${o(1.1)}; }
    93%, 100% { opacity: 0; background-position: 72% top; }
}`
        ].filter(Boolean).join('\n');
    }

    if (efeito === 'brasas') {
        // o visual clássico: fagulhas subindo reto, fumaça difusa e o brilho
        // quente parado na base — sem pulso e sem vaivém
        return clip + [
            chao(u('brasas-chao.svg'), 80, opacidade),
            camada(`${PAINEL}::after`, u('brasas-a.svg'), 620, 340, v(20),
                opacidade, 'ta_brasa_lenta', { subindo: true }),
            completo && camada(`${CONTEUDO}::after`, u('brasas-b.svg'), 400, 230,
                v(11), opacidade * 0.85, 'ta_brasa_rapida', { subindo: true })
        ].filter(Boolean).join('\n');
    }

    return '';
}

// ─── Aplicação ───────────────────────────────────────────────────────────────
// O workbench não recarrega estilos gravados em seus arquivos: o Chromium os
// serve do cache. Então o patch é um carregador FIXO, que relê `atual.css` a
// cada 1s — o CSP do workbench permite fetch same-origin em vscode-file://.
// O bloco não embute nada que mude entre efeitos ou versões: o atual.css mora
// no globalStorage, cujo caminho não muda quando a extensão atualiza. Trocar
// de efeito é só reescrever esse arquivo — aplica ao vivo, sem reload. O único
// reload que existe é o da primeira instalação (ou quando uma atualização do
// VS Code apaga o patch).

function caminhoJs() {
    return path.join(vscode.env.appRoot, 'out', 'vs', 'workbench',
        'workbench.desktop.main.js');
}

function caminhoCssVsCode() {
    return path.join(vscode.env.appRoot, 'out', 'vs', 'workbench',
        'workbench.desktop.main.css');
}

function arquivoCss(context) {
    // globalStorage: raiz válida do protocolo vscode-file (junto com appRoot e
    // a pasta de extensões) e, ao contrário da pasta da extensão, o caminho
    // não muda a cada versão — o patch continua válido depois de atualizar
    return path.join(context.globalStorageUri.fsPath, 'atual.css');
}

function semNossoBloco(texto) {
    const inicio = texto.indexOf(MARCA_INICIO);
    if (inicio < 0) return texto;
    // a marca de fim só vale se vier DEPOIS da de início; sem esse par não dá
    // para saber onde o bloco termina — aí é melhor deixar o resquício quieto
    // do que decepar o arquivo (foi isso que arrancou 3,4 KB de CSS do
    // workbench e deixou o campo de commit do Git renderizando fora da caixa)
    const fim = texto.indexOf(MARCA_FIM, inicio + MARCA_INICIO.length);
    if (fim < 0) return texto;
    return texto.slice(0, inicio) + texto.slice(fim + MARCA_FIM.length);
}

/** Versões antigas gravavam o efeito direto no CSS do VS Code; limpa o resto. */
function limparCssAntigo() {
    try {
        const arquivo = caminhoCssVsCode();
        const css = fs.readFileSync(arquivo, 'utf8');
        const limpo = semNossoBloco(css);
        if (limpo !== css) fs.writeFileSync(arquivo, limpo, 'utf8');
    } catch (_) {
        // sem permissão ou já limpo: não é motivo para falhar
    }
}

/**
 * A extensão antiga Fundo Animado (aposentada em favor desta) gravava um bloco
 * vscode-background no workbench.html que desenhava o efeito SEMPRE, ignorando
 * qualquer configuração — era ele que mantinha neve na tela mesmo no "Nenhum".
 * Remove só blocos que citam fundo-animado, sem tocar em patch de terceiros.
 */
function limparHtmlAntigo() {
    for (const pasta of ['electron-browser', 'electron-sandbox']) {
        try {
            const arquivo = path.join(vscode.env.appRoot, 'out', 'vs', 'code',
                pasta, 'workbench', 'workbench.html');
            const html = fs.readFileSync(arquivo, 'utf8');
            const limpo = html.replace(
                /\n?<!-- vscode-background-start[\s\S]*?<!-- vscode-background-end -->/g,
                (bloco) => bloco.includes('fundo-animado') ? '' : bloco);
            if (limpo !== html) fs.writeFileSync(arquivo, limpo, 'utf8');
        } catch (_) {
            // pasta de outra época do VS Code ou sem permissão: segue
        }
    }
}

// Mexer nos arquivos do workbench faz o VS Code avisar "instalação corrompida"
// a cada abertura. O patch aqui é intencional, então o aviso só atrapalha:
// este CSS (sempre presente no atual.css, mesmo no efeito "nenhum") esconde
// esse toast específico, nas traduções em que ele existe.
const AVISO_CORROMPIDO = [
    'installation appears to be corrupt. Please reinstall.',
    'parece estar corrompida. Reinstale-o.',
    'parece estar dañada. Vuelva a instalar.',
    'semble être endommagée. Effectuez une réinstallation.',
    'sembra danneggiata. Reinstallare.',
    'Installation ist offenbar beschädigt. Führen Sie eine Neuinstallation durch.',
    'je pravděpodobně poškozená. Proveďte prosím přeinstalaci.',
    'prawdopodobnie jest uszkodzona. Spróbuj zainstalować ponownie.',
    'повреждена. Повторите установку.',
    'yüklemeniz bozuk gibi görünüyor. Lütfen yeniden yükleyin.',
    'インストールが壊れている可能性があります。再インストールしてください。',
    '설치가 손상된 것 같습니다. 다시 설치하세요.',
    '安装似乎损坏。请重新安装。',
    '安裝似乎已損毀。請重新安裝。'
].map((texto) =>
    `.notification-toast-container:has([aria-label*='${texto}']){display:none;}`
).join('\n');

function scriptCarregador(urlCss) {
    return `;(function () {
    var ID = 'terminal-animado-estilo';
    var URL = ${JSON.stringify(urlCss)};
    var ultimo = null;
    function aplicar(texto) {
        var el = document.getElementById(ID);
        if (!el) {
            el = document.createElement('style');
            el.id = ID;
            document.head.appendChild(el);
        }
        el.textContent = texto;
    }
    function tick() {
        try {
            fetch(URL, { cache: 'no-store' })
                .then(function (r) { return r.ok ? r.text() : null; })
                .then(function (texto) {
                    // leitura vazia ou com erro NUNCA vale: o atual.css sempre
                    // tem ao menos o CSS do aviso. Aplicar '' aqui apagava o
                    // efeito por um tick e o retorno reiniciava as animações
                    // do zero — o "engasgo" periódico. Mantém o último CSS bom.
                    if (texto && texto !== ultimo) { ultimo = texto; aplicar(texto); }
                })
                .catch(function () { });
        } catch (e) { }
    }
    function iniciar() { tick(); setInterval(tick, 1000); }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();`;
}


/** O bloco é 100% estável: nada nele muda com o efeito nem com a versão. */
function blocoCarregador(context) {
    return `\n${MARCA_INICIO}\n${scriptCarregador(
        'vscode-file://vscode-app' + arquivoCss(context))}\n${MARCA_FIM}\n`;
}

/**
 * Garante o carregador no JS do workbench.
 * @returns {'ja'|'primeira'|'atualizado'|'falha'} 'ja' = nada a fazer.
 */
async function garantirCarregador(context) {
    const bloco = blocoCarregador(context);

    let js;
    try {
        js = fs.readFileSync(caminhoJs(), 'utf8');
    } catch (erro) {
        vscode.window.showErrorMessage(
            `Terminal Animado: não consegui ler os arquivos do VS Code (${erro.code}).`);
        return 'falha';
    }

    if (js.includes(bloco)) return 'ja';
    const primeiraVez = !js.includes(MARCA_INICIO);

    try {
        fs.writeFileSync(caminhoJs(), semNossoBloco(js) + bloco, 'utf8');
        return primeiraVez ? 'primeira' : 'atualizado';
    } catch (erro) {
        if (erro.code === 'EACCES' || erro.code === 'EPERM') {
            const comando = `sudo chown -R $USER "${vscode.env.appRoot}"`;
            const escolha = await vscode.window.showErrorMessage(
                'Terminal Animado precisa de permissão para escrever nos arquivos do ' +
                'VS Code. Rode o comando abaixo no terminal e tente de novo.',
                'Copiar comando');
            if (escolha === 'Copiar comando') {
                await vscode.env.clipboard.writeText(comando);
            }
        } else {
            vscode.window.showErrorMessage(
                `Terminal Animado: falha ao gravar (${erro.code}).`);
        }
        return 'falha';
    }
}

function configuracao() {
    const cfg = vscode.workspace.getConfiguration('terminalAnimado');
    return {
        efeito: cfg.get('efeito', 'nenhum'),
        opacidade: cfg.get('opacidade', 0.5),
        velocidade: cfg.get('velocidade', 1),
        qualidade: cfg.get('qualidade', 'completo'),
        colorir: cfg.get('colorirInterface', true)
    };
}

async function aplicarDaConfig(context) {
    const { efeito, opacidade, velocidade, qualidade, colorir } = configuracao();
    const corpo = EFEITOS[efeito]
        ? cssDoEfeito(context, efeito, opacidade, velocidade, qualidade)
        : '';

    const arquivo = arquivoCss(context);
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    // gravação atômica: escreve num temporário e renomeia. Gravar direto
    // deixava uma janela em que o carregador lia o arquivo truncado no meio
    // da escrita, aplicava CSS quebrado e o tick seguinte reiniciava as
    // animações do zero
    const temporario = arquivo + '.tmp';
    fs.writeFileSync(temporario, `${AVISO_CORROMPIDO}\n${corpo}`, 'utf8');
    fs.renameSync(temporario, arquivo);

    await aplicarCores(context,
        colorir && PALETAS[efeito] ? PALETAS[efeito] : {});

    // a gravação acima já é a troca: o carregador relê o atual.css a cada 1s
    // e aplica ao vivo. Reload só existe quando o patch em si não está no ar —
    // primeira instalação, migração de versão antiga ou VS Code atualizado.
    const estado = await garantirCarregador(context);
    if (estado === 'primeira' || estado === 'atualizado') {
        const escolha = await vscode.window.showInformationMessage(
            'Terminal Animado: recarregue a janela uma vez para ativar. ' +
            'Depois disso as trocas aplicam na hora, sem recarregar.',
            'Recarregar agora');
        if (escolha === 'Recarregar agora') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}

/**
 * Encapsula uma função assíncrona sem parâmetros para nunca rodar duas
 * instâncias em voo ao mesmo tempo: uma chamada que chega enquanto a
 * anterior ainda está rodando só marca "pendente" — ao terminar, roda-se UMA
 * vez a mais, pegando o estado mais recente (não uma vez por chamada
 * pendente, senão uma sequência rápida de trocas enfileira trabalho à toa).
 *
 * Sem isto, duas chamadas de aplicarDaConfig concorrentes — o apply da
 * ativação da janela ainda em voo quando o usuário troca de efeito, duas
 * trocas rápidas em seguida, ou o mesmo `terminalAnimado.efeito` global
 * mudando em duas janelas ao mesmo tempo — podiam terminar em ORDEM
 * TROCADA: a mais lenta, presa a um estado mais velho, ainda vencia a
 * corrida e escrevia por cima da mais rápida. Era isso que fazia a cor nova
 * aparecer e, um instante depois, voltar para a antiga.
 */
function serializarComColapso(fn) {
    let emVoo = null;
    let pendente = false;
    function agendar() {
        if (emVoo) {
            pendente = true;
            return emVoo;
        }
        pendente = false;
        emVoo = Promise.resolve()
            .then(fn)
            .catch((erro) => {
                console.error('Terminal Animado: falha ao aplicar configuração.', erro);
            })
            .finally(() => {
                emVoo = null;
                if (pendente) agendar();
            });
        return emVoo;
    }
    return agendar;
}

function activate(context) {
    limparCssAntigo();
    limparHtmlAntigo();
    const agendarAplicarDaConfig = serializarComColapso(() => aplicarDaConfig(context));
    agendarAplicarDaConfig();

    context.subscriptions.push(
        vscode.commands.registerCommand('terminalAnimado.escolher', () => {
            const { efeito } = configuracao();
            const itens = Object.entries(EFEITOS).map(([chave, e]) => ({
                label: e.rotulo, detail: e.detalhe, chave
            }));
            itens.push({ label: '🚫  Nenhum', detail: 'Remove o fundo', chave: 'nenhum' });

            const atual = itens.find((i) => i.chave === efeito);
            if (atual) atual.description = '●  atual';

            const escolhedor = vscode.window.createQuickPick();
            escolhedor.items = itens;
            escolhedor.placeholder = 'Escolha o efeito do fundo do terminal';
            if (atual) escolhedor.activeItems = [atual];
            escolhedor.onDidAccept(async () => {
                const escolha = escolhedor.selectedItems[0];
                escolhedor.hide();
                if (!escolha) return;
                // a aplicação acontece no onDidChangeConfiguration
                await vscode.workspace.getConfiguration('terminalAnimado')
                    .update('efeito', escolha.chave, vscode.ConfigurationTarget.Global);
            });
            escolhedor.onDidHide(() => escolhedor.dispose());
            escolhedor.show();
        }),

        vscode.commands.registerCommand('terminalAnimado.remover', async () => {
            await vscode.workspace.getConfiguration('terminalAnimado')
                .update('efeito', 'nenhum', vscode.ConfigurationTarget.Global);
        }),

        vscode.commands.registerCommand('terminalAnimado.alternarCores', async () => {
            const cfg = vscode.workspace.getConfiguration('terminalAnimado');
            const liga = !cfg.get('colorirInterface', true);
            try {
                // a aplicação (ou restauração) acontece no onDidChangeConfiguration
                await cfg.update('colorirInterface', liga,
                    vscode.ConfigurationTarget.Global);
            } catch (_) {
                // atualização instalada sem reload: o host de extensões já roda
                // o código novo, mas a janela só registra configurações novas
                // do package.json ao recarregar — até lá o update é rejeitado
                const escolha = await vscode.window.showWarningMessage(
                    'Terminal Animado: recarregue a janela para concluir a ' +
                    'atualização da extensão.', 'Recarregar agora');
                if (escolha === 'Recarregar agora') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
                return;
            }
            vscode.window.setStatusBarMessage(liga
                ? 'Terminal Animado: cores da interface ligadas'
                : 'Terminal Animado: cores da interface desligadas', 3000);
        }),

        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('terminalAnimado')) {
                agendarAplicarDaConfig();
            }
        })
    );
}

function deactivate() { }

// _cssDoEfeito fica exposto para os testes de desempenho;
// _blocoCarregador, para ferramentas que pré-aplicam o patch;
// _aplicarCores e _paletas, para os testes de backup/restauração das cores;
// _serializarComColapso, para o teste da fila que evita a corrida de escrita
module.exports = {
    activate, deactivate,
    _cssDoEfeito: cssDoEfeito,
    _blocoCarregador: blocoCarregador,
    _aplicarCores: aplicarCores,
    _paletas: PALETAS,
    _serializarComColapso: serializarComColapso
};
