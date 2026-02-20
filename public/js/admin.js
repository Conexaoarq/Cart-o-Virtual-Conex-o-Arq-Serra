// ── State ─────────────────────────────────────────────────────────
let allMembers = [];
let editingId = null;

// Preenche o select de anos dinamicamente
function populateYears() {
    const sel = document.getElementById('f-validade-ano');
    if (!sel) return;
    const now = new Date().getFullYear();
    for (let y = now; y <= now + 10; y++) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        sel.appendChild(opt);
    }
}

// ── Load members ──────────────────────────────────────────────────
async function loadMembers() {
    try {
        const res = await fetch('/api/members');
        allMembers = await res.json();
        renderStats();
        renderTable(allMembers);
    } catch {
        showToast('Erro ao carregar filiados');
    }
}

function renderStats() {
    const ativos = allMembers.filter(m => m.ativo).length;
    const inativos = allMembers.length - ativos;
    document.getElementById('stat-total').textContent = allMembers.length;
    document.getElementById('stat-ativos').textContent = ativos;
    document.getElementById('stat-inativos').textContent = inativos;
}

function renderTable(members) {
    const tbody = document.getElementById('members-tbody');
    if (!members.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <p>👥</p><p>Nenhum filiado cadastrado ainda.</p>
    </div></td></tr>`;
        return;
    }
    tbody.innerHTML = members.map(m => `
    <tr>
      <td>
        <div class="member-cell">
          <div class="member-avatar">👤</div>
          <div>
            <div class="member-name-cell">${m.nome}</div>
            <div class="member-id-cell">${m.email || '—'}</div>
          </div>
        </div>
      </td>
      <td>#${m.numeroFiliacao}</td>
      <td><span class="badge badge-${m.categoria?.toLowerCase()}">${m.categoria}</span></td>
      <td>${formatDate(m.validade)}</td>
      <td><span class="badge badge-${m.ativo ? 'ativo' : 'inativo'}">${m.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Ver cartão" onclick="viewCard('${m.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-icon" title="Copiar link" onclick="copyLink('${m.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button class="btn-icon whatsapp" title="Enviar por WhatsApp" onclick="sendWhatsApp('${m.id}', '${m.nome}', '${m.telefone || ''}')" style="color:#25D366;border-color:#dcfce7">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.555 4.112 1.523 5.84L.057 23.943l6.26-1.442A11.935 11.935 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.867 9.867 0 0 1-5.031-1.378l-.36-.214-3.733.86.922-3.574-.235-.372A9.867 9.867 0 0 1 2.106 12C2.106 6.54 6.54 2.106 12 2.106S21.894 6.54 21.894 12 17.46 21.894 12 21.894z"/>
            </svg>
          </button>
          <button class="btn-icon" title="Editar" onclick="openEdit('${m.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon danger" title="Excluir" onclick="deleteMember('${m.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Filter ────────────────────────────────────────────────────────
function filterTable() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('filter-categoria').value;
    const sta = document.getElementById('filter-status').value;

    const filtered = allMembers.filter(m => {
        const matchQ = !q || m.nome.toLowerCase().includes(q)
            || m.numeroFiliacao.includes(q)
            || (m.email && m.email.toLowerCase().includes(q));
        const matchCat = !cat || m.categoria === cat;
        const matchSta = sta === '' || String(m.ativo) === sta;
        return matchQ && matchCat && matchSta;
    });
    renderTable(filtered);
}

// ── Modal: Open / Close ────────────────────────────────────────────
function openModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Novo Filiado';
    document.getElementById('save-btn-text').textContent = 'Salvar Filiado';
    document.getElementById('edit-id').value = '';
    document.getElementById('f-nome').value = '';
    document.getElementById('f-email').value = '';
    document.getElementById('f-telefone').value = '';
    document.getElementById('f-categoria').value = 'Standard';
    const now = new Date();
    const next = new Date(now.getFullYear() + 1, now.getMonth());
    document.getElementById('f-validade-mes').value = String(next.getMonth() + 1).padStart(2, '0');
    document.getElementById('f-validade-ano').value = String(next.getFullYear());
    document.getElementById('modal').style.display = 'flex';
}

function openEdit(id) {
    const m = allMembers.find(x => x.id === id);
    if (!m) return;
    editingId = id;
    document.getElementById('modal-title').textContent = 'Editar Filiado';
    document.getElementById('save-btn-text').textContent = 'Atualizar';
    document.getElementById('edit-id').value = m.id;
    document.getElementById('f-nome').value = m.nome;
    document.getElementById('f-email').value = m.email || '';
    document.getElementById('f-telefone').value = m.telefone || '';
    document.getElementById('f-categoria').value = m.categoria;
    if (m.validade) {
        const parts = m.validade.split('/');
        if (parts.length === 2) {
            document.getElementById('f-validade-mes').value = parts[0];
            document.getElementById('f-validade-ano').value = parts[1];
        }
    }
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}
function closeModalOutside(e) {
    if (e.target === document.getElementById('modal')) closeModal();
}

// ── Save (create or update) ────────────────────────────────────────
async function saveMember() {
    const nome = document.getElementById('f-nome').value.trim();
    const categoria = document.getElementById('f-categoria').value;
    if (!nome) { showToast('O nome é obrigatório'); return; }

    const mes = document.getElementById('f-validade-mes').value;
    const ano = document.getElementById('f-validade-ano').value;
    const validade = `${mes}/${ano}`;

    const body = {
        nome,
        email: document.getElementById('f-email').value.trim(),
        telefone: document.getElementById('f-telefone').value.trim(),
        categoria,
        validade
    };

    try {
        const url = editingId ? `/api/members/${editingId}` : '/api/members';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error();

        showToast(editingId ? 'Filiado atualizado com sucesso!' : 'Filiado cadastrado com sucesso!');
        closeModal();
        await loadMembers();
    } catch {
        showToast('Erro ao salvar filiado');
    }
}

// ── Delete ─────────────────────────────────────────────────────────
async function deleteMember(id) {
    const m = allMembers.find(x => x.id === id);
    if (!confirm(`Excluir o filiado "${m?.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
        await fetch(`/api/members/${id}`, { method: 'DELETE' });
        showToast('Filiado excluído');
        await loadMembers();
    } catch {
        showToast('Erro ao excluir');
    }
}

// ── Actions ────────────────────────────────────────────────────────
function viewCard(id) { window.open(`/card.html?id=${id}`, '_blank'); }

async function copyLink(id) {
    const url = `${location.origin}/card.html?id=${id}`;
    try {
        await navigator.clipboard.writeText(url);
        showToast('Link do cartão copiado!');
    } catch {
        showToast('Erro ao copiar link');
    }
}

function sendWhatsApp(id, nome, telefone) {
    const cardUrl = `${location.origin}/card.html?id=${id}`;
    const msg = encodeURIComponent(
        `Olá, ${nome}! 🎉\n\nSeu cartão de filiado da *Conexão Arq Serra* está pronto.\n\nAcesse o link abaixo e adicione à tela inicial do seu celular para ter sempre à mão:\n\n${cardUrl}\n\n_Este cartão funciona offline após o primeiro acesso._`
    );
    // Se tiver telefone, abre conversa direta; senão, abre o WhatsApp para escolher contato
    const tel = telefone ? telefone.replace(/\D/g, '') : '';
    const waUrl = tel
        ? `https://wa.me/55${tel}?text=${msg}`
        : `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
}

// ── Helpers ────────────────────────────────────────────────────────
function formatDate(val) {
    return val || '–';
}


function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function showSection(s) { /* reserved for future sections */ }

// ── Init ──────────────────────────────────────────────────────────
populateYears();
loadMembers();
