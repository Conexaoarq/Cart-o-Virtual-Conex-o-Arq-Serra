// ── PWA Install prompt ────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'flex';
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        document.getElementById('install-banner').style.display = 'none';
    }
    deferredPrompt = null;
});

document.getElementById('install-close')?.addEventListener('click', () => {
    document.getElementById('install-banner').style.display = 'none';
});

// ── Load card data ────────────────────────────────────────────────
async function loadCard() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (!id) {
        showError();
        return;
    }

    try {
        const res = await fetch(`/api/members/${id}`);
        if (!res.ok) throw new Error('not_found');
        const member = await res.json();
        // Cache for offline
        try { localStorage.setItem(`member_${id}`, JSON.stringify(member)); } catch {}
        fillCard(member);
    } catch (err) {
        // Try cache
        const cached = localStorage.getItem(`member_${id}`);
        if (cached) {
            const member = JSON.parse(cached);
            fillCard(member);
            showOfflineBadge();
        } else {
            showError();
        }
    }
}

function fillCard(m) {
    document.title = `${m.nome} – Conexão Arq Serra`;
    document.getElementById('member-nome').textContent = m.nome;
    document.getElementById('member-numero').textContent = `#${m.numeroFiliacao}`;
    document.getElementById('member-validade').textContent = m.validade || '–';

    const badge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    if (!m.ativo) {
        badge.classList.add('inactive');
        statusText.textContent = 'INATIVO';
    } else {
        statusText.textContent = 'ATIVO';
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('card-container').style.display = 'flex';
}

function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'flex';
}

function showOfflineBadge() {
    const badge = document.getElementById('status-badge');
    if (badge) {
        const offlineNote = document.createElement('span');
        offlineNote.style.cssText = 'font-size:0.55rem;color:rgba(184,144,106,0.6);margin-left:4px';
        offlineNote.textContent = '· offline';
        badge.appendChild(offlineNote);
    }
}

// ── Flip ──────────────────────────────────────────────────────────
function flipCard() {
    document.getElementById('member-card').classList.toggle('flipped');
}
document.getElementById('member-card')?.addEventListener('click', function (e) {
    if (e.target.closest('.flip-hint')) return;
    this.classList.toggle('flipped');
});

// ── Share ─────────────────────────────────────────────────────────
async function shareCard() {
    const url = location.href;
    if (navigator.share) {
        await navigator.share({ title: 'Cartão Conexão Arq Serra', url });
    } else {
        await navigator.clipboard.writeText(url);
        alert('Link copiado para a área de transferência!');
    }
}

// ── Service Worker ────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Init ──────────────────────────────────────────────────────────
loadCard();
