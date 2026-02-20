// ── PWA: Registro do Service Worker ──────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

// ── PWA: Prompt de instalação ─────────────────────────────────────
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'flex';
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === 'accepted') {
    document.getElementById('install-banner').style.display = 'none';
  }
});

document.getElementById('install-close')?.addEventListener('click', () => {
  document.getElementById('install-banner').style.display = 'none';
});

// ── Flip do cartão ────────────────────────────────────────────────
function flipCard() {
  document.getElementById('member-card')?.classList.toggle('flipped');
}
document.getElementById('member-card')?.addEventListener('click', flipCard);

// ── Formatadores ──────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
}
function formatSince(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// ── Preencher o cartão com os dados do filiado ────────────────────
function fillCard(data) {
  document.getElementById('member-nome').textContent     = data.nome || '–';
  document.getElementById('member-numero').textContent   = `#${data.numeroFiliacao}`;
  document.getElementById('member-validade').textContent = formatDate(data.validade);
  document.getElementById('badge-categoria').textContent = (data.categoria || '').toUpperCase();

  // Foto
  if (data.photo) {
    const img = document.getElementById('member-photo');
    img.src = data.photo;
    img.style.display = 'block';
    document.getElementById('photo-placeholder').style.display = 'none';
  }

  // Verso
  document.getElementById('member-nome-back').textContent   = data.nome || '–';
  document.getElementById('member-numero-back').textContent = `Filiado nº ${data.numeroFiliacao}`;
  document.getElementById('member-since').textContent       = `Membro desde ${formatSince(data.dataFiliacao)}`;

  // QR Code
  if (data.qrCode) {
    document.getElementById('qr-code-img').src = data.qrCode;
  }

  // Status
  if (!data.ativo) {
    document.getElementById('status-badge').classList.add('inactive');
    document.getElementById('status-text').textContent = 'INATIVO';
  }

  document.title = `${data.nome} – Conexão Arq Serra`;
}

// ── Chave de cache no localStorage ───────────────────────────────
function cacheKey(id) { return `card_${id}`; }

function saveToCache(id, data) {
  try {
    localStorage.setItem(cacheKey(id), JSON.stringify(data));
  } catch { /* storage cheio — ignora */ }
}

function loadFromCache(id) {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Carregar dados (online primeiro, cache como fallback) ─────────
async function loadCard() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const loading = document.getElementById('loading');
  const error   = document.getElementById('error');
  const card    = document.getElementById('card-container');

  if (!id) {
    loading.style.display = 'none';
    error.style.display   = 'flex';
    return;
  }

  // 1. Tentar carregar da rede
  try {
    const res = await fetch(`/api/members/${id}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('not found');
    const data = await res.json();

    // Salvar no cache local para uso offline futuro
    saveToCache(id, data);

    fillCard(data);
    loading.style.display = 'none';
    card.style.display    = 'flex';
    return;
  } catch (networkErr) {
    // 2. Sem internet: tentar carregar do cache local
    const cached = loadFromCache(id);
    if (cached) {
      fillCard(cached);

      // Mostrar aviso de modo offline
      const banner = document.getElementById('install-banner');
      if (banner) {
        banner.style.display = 'flex';
        banner.querySelector('span').textContent = '📴 Modo offline — exibindo dados salvos';
        const btn = document.getElementById('install-btn');
        if (btn) btn.style.display = 'none';
      }

      loading.style.display = 'none';
      card.style.display    = 'flex';
      return;
    }

    // 3. Sem rede e sem cache: exibir erro
    loading.style.display = 'none';
    error.style.display   = 'flex';
    document.querySelector('.error-screen p:last-child').textContent =
      'Sem conexão e nenhum dado salvo. Acesse novamente quando tiver internet para ativar o modo offline.';
  }
}

// ── Compartilhar ──────────────────────────────────────────────────
async function shareCard() {
  const url = location.href;
  if (navigator.share) {
    await navigator.share({ title: 'Meu Cartão – Conexão Arq Serra', url });
  } else {
    await navigator.clipboard.writeText(url);
    alert('Link copiado!');
  }
}

// ── Init ──────────────────────────────────────────────────────────
loadCard();
