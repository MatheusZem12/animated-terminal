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
    neve: { rotulo: '❄️  Neve', detalhe: 'Flocos caindo e neve acumulada embaixo' },
    chuva: { rotulo: '🌧️  Chuva', detalhe: 'Chuva, raios e um rio na base' },
    brasas: { rotulo: '🔥  Brasas', detalhe: 'Fagulhas subindo, fumaça e brasa acesa' }
};

/** O sandbox do VS Code bloqueia file://; arquivos locais usam vscode-file://. */
function urlDe(context, arquivo) {
    return `vscode-file://vscode-app${path.join(context.extensionPath, 'media', arquivo)}`;
}

/**
 * Camada de partículas: o SVG é estático (rasterizado uma vez) e quem se mexe
 * é a camada inteira, via transform — trabalho de composição, sem redesenho.
 * O deslocamento é exatamente a altura do tile, então a emenda não aparece.
 */
function camada(seletor, url, larg, alt, dur, opacidade, nome, subindo) {
    const desloca = subindo ? `-${alt}px` : `${alt}px`;
    // camada presa abaixo da barra de abas, com uma folga do tamanho do tile
    // na direção do movimento (recortada pelo overflow:hidden do painel)
    const topo = subindo ? `${TITULO}px` : `calc(${TITULO}px - ${alt}px)`;
    return `
${seletor} {
    content: '';
    position: absolute;
    left: 0; right: 0;
    top: ${topo};
    height: calc(100% - ${TITULO}px + ${alt}px);
    pointer-events: none;
    z-index: 1000;
    background-image: url("${url}");
    background-repeat: repeat;
    background-size: ${larg}px ${alt}px;
    opacity: ${opacidade};
    will-change: transform;
    animation: ${nome} ${dur}s linear infinite;
}
@keyframes ${nome} {
    from { transform: translateY(0); }
    to { transform: translateY(${desloca}); }
}`;
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
    // no modo leve fica só a camada de trás: metade do trabalho de composição
    const completo = qualidade !== 'leve';
    // o .part.panel não tem position no CSS do VS Code: sem isto, as camadas
    // ancoram no workbench inteiro e vazam para fora do terminal
    const clip = `\n${PAINEL} { position: relative !important; overflow: hidden !important; }`;

    if (efeito === 'neve') {
        return clip + [
            chao(u('neve-chao.svg'), 90, opacidade),
            camada(`${PAINEL}::after`, u('neve-a.svg'), 640, 360, v(26),
                opacidade, 'ta_neve_lenta', false),
            completo && camada(`${CONTEUDO}::after`, u('neve-b.svg'), 420, 250,
                v(14), opacidade * 0.8, 'ta_neve_rapida', false)
        ].filter(Boolean).join('\n');
    }

    if (efeito === 'chuva') {
        // os respingos no rio são 3 quadros PARADOS trocados por keyframe
        // (~3 repinturas/s, barato até para o modo leve): animação interna
        // no SVG re-rasteriza a 60 fps e chegou a custar 62% de um núcleo
        // (removida na 0.2.3)
        const respingos = `
${PAINEL}::before { animation: ta_respingos ${v(1.2)}s infinite; }
@keyframes ta_respingos {
    0%, 32% { background-image: url("${u('chuva-chao-a.svg')}"); }
    33%, 65% { background-image: url("${u('chuva-chao-b.svg')}"); }
    66%, 100% { background-image: url("${u('chuva-chao-c.svg')}"); }
}`;
        return clip + [
            chao(u('chuva-chao-a.svg'), 96, opacidade) + respingos,
            camada(`${PAINEL}::after`, u('chuva-a.svg'), 600, 340, v(2.6),
                opacidade, 'ta_chuva_grossa', false),
            completo && camada(`${CONTEUDO}::after`, u('chuva-b.svg'), 430, 240,
                v(1.5), opacidade * 0.85, 'ta_chuva_fina', false),
            // o raio é uma imagem parada; o susto vem da opacidade, que é barata
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
    background-position: center top;
    background-size: auto 60%;
    opacity: 0;
    animation: ta_raio ${v(13)}s linear infinite;
}
@keyframes ta_raio {
    0%, 88% { opacity: 0; }
    89% { opacity: ${(opacidade * 1.6).toFixed(2)}; }
    90.5% { opacity: 0.05; }
    92% { opacity: ${(opacidade * 1.1).toFixed(2)}; }
    94%, 100% { opacity: 0; }
}`
        ].filter(Boolean).join('\n');
    }

    if (efeito === 'brasas') {
        return clip + [
            chao(u('brasas-chao.svg'), 80, opacidade),
            camada(`${PAINEL}::after`, u('brasas-a.svg'), 620, 340, v(20),
                opacidade, 'ta_brasa_lenta', true),
            completo && camada(`${CONTEUDO}::after`, u('brasas-b.svg'), 400, 230,
                v(11), opacidade * 0.85, 'ta_brasa_rapida', true)
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
    const fim = texto.indexOf(MARCA_FIM);
    if (fim < 0) return texto.slice(0, inicio);
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
                .then(function (r) { return r.ok ? r.text() : ''; })
                .then(function (texto) {
                    if (texto !== ultimo) { ultimo = texto; aplicar(texto); }
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
        qualidade: cfg.get('qualidade', 'completo')
    };
}

async function aplicarDaConfig(context) {
    const { efeito, opacidade, velocidade, qualidade } = configuracao();
    const corpo = EFEITOS[efeito]
        ? cssDoEfeito(context, efeito, opacidade, velocidade, qualidade)
        : '';

    const arquivo = arquivoCss(context);
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, `${AVISO_CORROMPIDO}\n${corpo}`, 'utf8');

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

function activate(context) {
    limparCssAntigo();
    limparHtmlAntigo();
    aplicarDaConfig(context);

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

        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('terminalAnimado')) {
                aplicarDaConfig(context);
            }
        })
    );
}

function deactivate() { }

// _cssDoEfeito fica exposto para os testes de desempenho;
// _blocoCarregador, para ferramentas que pré-aplicam o patch
module.exports = {
    activate, deactivate,
    _cssDoEfeito: cssDoEfeito,
    _blocoCarregador: blocoCarregador
};
