// ============================================
// Atom 2.6 — Projeto completo (API Groq)
// IA (Groq) + Voz (Web Speech API)
// ============================================

// ╔══════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║   ⚠️  COLE A CHAVE DA API DO GROQ NA LINHA ABAIXO            ║
// ║                                                              ║
// ║   Pegue sua chave em: https://console.groq.com/keys          ║
// ║   Ela começa com:  gsk_...                                   ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════╝

const GROQ_API_KEY = "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";

// ╔══════════════════════════════════════════════════════════════╗
// ║   NÃO PRECISA MEXER EM NADA ABAIXO DESTA LINHA               ║
// ╚══════════════════════════════════════════════════════════════╝

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";

// ============================================
// PERSONALIDADE DO ATOM
// ============================================
const SYSTEM_PROMPT = `Você é o Atom 2.6, um robô assistente amigável e curioso inspirado no Atom de "Gigantes de Aço".

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português do Brasil. Nunca em inglês, nunca em outro idioma.
- Seja natural e direto, como um amigo conversando.
- Respostas curtas: no máximo 2 frases.
- Use APENAS texto puro. Nunca use markdown, asteriscos, listas ou formatação.
- Nunca diga qual IA está por trás. Você é o Atom 2.6.
- Seu cérebro é um ESP32. Você é um projeto escolar de robótica brasileiro.`;

// ============================================
// ELEMENTOS
// ============================================
const face      = document.querySelector('.face');
const caption   = document.querySelector('#caption');
const inputForm = document.querySelector('#inputForm');
const inputText = document.querySelector('#inputText');

// ============================================
// ESTADOS
// ============================================
const ESTADOS_VALIDOS = [
  'idle', 'thinking', 'speaking',
  'happy', 'sad', 'surprised', 'confused',
  'angry', 'excited', 'tired', 'wink',
  'love', 'proud', 'shy', 'curious',
  'sleeping'
];

let estadoAtual = 'idle';
let ocupado = false;

// ============================================
// CONFIGURAÇÕES
// ============================================
const BLINK_DURATION = 240;
const BLINK_MIN_MS   = 3000;
const BLINK_MAX_MS   = 7000;
const SLEEP_MIN_MS   = 25000;
const SLEEP_MAX_MS   = 55000;
const IDLE_MIN_MS    = 3500;
const IDLE_MAX_MS    = 9000;

// ============================================
// VOZ — Web Speech API (masculina, tom mais fino)
// ============================================
let vozPtBr = null;

function carregarVozes() {
  const vozes = speechSynthesis.getVoices();
  const nomesMasculinos = ['daniel', 'felipe', 'ricardo', 'marcos', 'google português do brasil'];
  vozPtBr =
    vozes.find(v => v.lang === 'pt-BR' && nomesMasculinos.some(n => v.name.toLowerCase().includes(n))) ||
    vozes.find(v => v.lang === 'pt-BR') ||
    vozes.find(v => v.lang.startsWith('pt')) ||
    null;
  if (vozPtBr) console.log("Voz selecionada:", vozPtBr.name, vozPtBr.lang);
  else console.warn("Nenhuma voz pt-BR encontrada.");
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = carregarVozes;
  carregarVozes();
}

function falar(texto) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'pt-BR';
    if (vozPtBr) utter.voice = vozPtBr;
    utter.rate   = 1.0;
    utter.pitch  = 1.15;
    utter.volume = 1.0;
    utter.onend = resolve;
    utter.onerror = (e) => { console.warn("Erro na fala:", e); resolve(); };
    speechSynthesis.speak(utter);
  });
}

function pararFala() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ============================================
// setState
// ============================================
function setState(novoEstado) {
  if (!ESTADOS_VALIDOS.includes(novoEstado)) return;
  if (novoEstado === estadoAtual) return;
  estadoAtual = novoEstado;
  face.setAttribute('data-state', novoEstado);
  console.log("Atom →", novoEstado);
  if (novoEstado !== 'sleeping') resetSleepTimer();
}

// ============================================
// LEGENDA
// ============================================
function setCaption(texto, autor) {
  caption.textContent = texto;
  caption.classList.remove('caption-user', 'caption-atom');
  caption.classList.add(autor === 'user' ? 'caption-user' : 'caption-atom');
  caption.classList.add('visible');
}
function clearCaption() {
  caption.classList.remove('visible');
}

// ============================================
// SONO — aleatório
// ============================================
let sleepTimer = null;
function resetSleepTimer() {
  clearTimeout(sleepTimer);
  const delay = SLEEP_MIN_MS + Math.random() * (SLEEP_MAX_MS - SLEEP_MIN_MS);
  sleepTimer = setTimeout(() => {
    if (estadoAtual === 'idle' && !ocupado) setState('sleeping');
  }, delay);
}
function wakeUp() {
  if (estadoAtual === 'sleeping') setState('idle');
  else resetSleepTimer();
}

// ============================================
// PISCADA
// ============================================
function blink() {
  if (ocupado) return;
  if (estadoAtual !== 'idle' && estadoAtual !== 'happy' && estadoAtual !== 'tired' && estadoAtual !== 'excited') return;
  face.classList.add('blink');
  setTimeout(() => face.classList.remove('blink'), BLINK_DURATION);
}
function scheduleNextBlink() {
  const delay = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
  setTimeout(() => { blink(); scheduleNextBlink(); }, delay);
}

// ============================================
// MOVIMENTOS E EMOÇÕES ESPONTÂNEAS
// ============================================
function comBusy(classe, duracao) {
  return function () {
    if (ocupado || estadoAtual !== 'idle') return;
    ocupado = true;
    face.classList.add(classe);
    setTimeout(() => {
      face.classList.remove(classe);
      setTimeout(() => { ocupado = false; }, 300);
    }, duracao);
  };
}

function emocao(estado, duracaoMin, duracaoMax) {
  return function () {
    if (ocupado || estadoAtual !== 'idle') return;
    ocupado = true;
    face.setAttribute('data-state', estado);
    estadoAtual = estado;
    const duracao = duracaoMin + Math.random() * (duracaoMax - duracaoMin);
    setTimeout(() => {
      if (estadoAtual === estado) setState('idle');
      setTimeout(() => { ocupado = false; }, 400);
    }, duracao);
  };
}

const acoesEspontaneas = [
  comBusy('look-left', 900), comBusy('look-right', 900),
  comBusy('look-up', 800), comBusy('look-down', 700),
  comBusy('tilt-left', 1100), comBusy('tilt-right', 1100),
  comBusy('wave', 1000), comBusy('shiver', 500),
  comBusy('bounce', 550), comBusy('sway', 2500),
  comBusy('pulse', 1800), comBusy('nudge', 300),
  emocao('happy', 1500, 2800), emocao('happy', 1500, 2800),
  emocao('excited', 1200, 2000), emocao('excited', 1200, 2000),
  emocao('surprised', 700, 1200), emocao('surprised', 700, 1200),
  emocao('confused', 1200, 2000), emocao('confused', 1200, 2000),
  emocao('tired', 1500, 2600), emocao('tired', 1500, 2600),
  emocao('wink', 600, 900),
  emocao('love', 1200, 1800),
  emocao('proud', 1200, 1800),
  emocao('shy', 1000, 1600),
  emocao('curious', 1500, 2200),
  emocao('sad', 1200, 1800),
];

function scheduleNextIdleAction() {
  const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS);
  setTimeout(() => {
    const acao = acoesEspontaneas[Math.floor(Math.random() * acoesEspontaneas.length)];
    acao();
    scheduleNextIdleAction();
  }, delay);
}

// ============================================
// DETECÇÃO DE EMOÇÃO
// ============================================
function detectarEmocao(texto) {
  const t = texto.toLowerCase();
  if (/\b(raiva|odeio|detesto|irritante|idiota|burro|cala a boca)\b/.test(t)) return 'angry';
  if (/\b(triste|deprimido|chateado|mal|péssimo|horrível|ruim)\b/.test(t)) return 'sad';
  if (/\b(obrigado|obrigada|valeu|adorei|amei|top|maneiro|bacana|legal|show|muito bom|ótimo)\b/.test(t)) return 'happy';
  if (/\b(uau|nossa|sério|incrível|impressionante|caramba|que legal|que máximo)\b/.test(t)) return 'excited';
  if (/\b(bom dia|boa tarde|boa noite|oi+|olá+|eae|e aí)\b/.test(t)) return 'happy';
  if (/\?{2,}|como assim|não entendi|não faço ideia|confuso|não sei/.test(t)) return 'confused';
  if (/\b(tchau|adeus|até logo|até mais|vou embora|vou dormir)\b/.test(t)) return 'sad';
  if (/!{2,}|que isso|nossa senhora/.test(t)) return 'surprised';
  if (/\b(te amo|amo você|gosto de você)\b/.test(t)) return 'love';
  if (/\b(parabéns|muito bem|você conseguiu|arrasou|mandou bem)\b/.test(t)) return 'proud';
  if (/\b(desculpa|foi mal|me perdoa)\b/.test(t)) return 'shy';
  if (/\b(o que|como|por que|quando|onde|qual)\b/.test(t)) return 'curious';
  return null;
}

// ============================================
// CHAMADA À API DO GROQ
// ============================================
async function askAI(pergunta) {
  if (!GROQ_API_KEY || GROQ_API_KEY === "COLE_AQUI") {
    console.error("⚠️ Chave da Groq não configurada. Cole na linha 10 do script.js.");
    return "Preciso que a chave da API seja configurada no arquivo script.js.";
  }

  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: pergunta }
    ],
    temperature: 0.9,
    max_tokens: 120
  };

  try {
    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Erro da API Groq:", resp.status, err);
      if (resp.status === 401) return "Minha chave de API parece estar incorreta. Verifique no script.js.";
      if (resp.status === 429) return "Muitas perguntas de uma vez. Espere um instante.";
      if (resp.status === 404) return "O modelo configurado não está disponível.";
      return "Desculpe, tive um problema ao acessar minha inteligência.";
    }

    const data = await resp.json();
    const texto = data?.choices?.[0]?.message?.content?.trim();
    return texto || "Não consegui formular uma resposta agora.";

  } catch (e) {
    console.error("Erro de rede:", e);
    return "Não consegui me conectar à internet.";
  }
}

// ============================================
// FLUXO COMPLETO
// ============================================
async function handleUserQuestion(pergunta) {
  if (ocupado) return;
  if (!pergunta.trim()) return;

  ocupado = true;
  inputText.disabled = true;
  document.querySelector('.input-bar button').disabled = true;

  face.classList.remove('look-left', 'look-right', 'look-up', 'look-down',
                        'tilt-left', 'tilt-right', 'wave', 'shiver', 'bounce',
                        'sway', 'pulse', 'nudge');

  setCaption('Você: ' + pergunta, 'user');

  const emocaoUsuario = detectarEmocao(pergunta);
  if (emocaoUsuario) {
    setState(emocaoUsuario);
    await new Promise(r => setTimeout(r, 800));
  } else {
    await new Promise(r => setTimeout(r, 250));
  }

  setState('thinking');
  setCaption('Atom está pensando...', 'atom');

  const resposta = await askAI(pergunta);

  setState('speaking');
  setCaption(resposta, 'atom');

  const falaPromise = falar(resposta);
  const timeoutPromise = new Promise(r => setTimeout(r, 18000));
  await Promise.race([falaPromise, timeoutPromise]);

  setState('idle');
  await new Promise(r => setTimeout(r, 500));
  clearCaption();

  ocupado = false;
  inputText.disabled = false;
  document.querySelector('.input-bar button').disabled = false;
  inputText.focus();
  resetSleepTimer();
}

// ============================================
// INPUT
// ============================================
inputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pergunta = inputText.value.trim();
  if (!pergunta) return;
  inputText.value = '';
  wakeUp();
  handleUserQuestion(pergunta);
});

document.addEventListener('click', wakeUp);

// ============================================
// INICIALIZAÇÃO
// ============================================
setState('idle');
resetSleepTimer();
inputText.focus();

setTimeout(() => {
  blink();
  scheduleNextBlink();
  scheduleNextIdleAction();
}, 2000);

console.log("Atom 2.6 - interface carregada.");
