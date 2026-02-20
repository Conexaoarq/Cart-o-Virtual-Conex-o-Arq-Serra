const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Storage para fotos dos filiados ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Banco de dados simples (JSON) ────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'members.json');

function loadMembers() {
  if (!fs.existsSync(DB_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
  catch { return []; }
}

function saveMembers(members) {
  fs.writeFileSync(DB_PATH, JSON.stringify(members, null, 2));
}

// ─── Rotas da API ─────────────────────────────────────────────────────────────

// Listar todos os filiados
app.get('/api/members', (req, res) => {
  res.json(loadMembers());
});

// Buscar filiado por ID
app.get('/api/members/:id', (req, res) => {
  const member = loadMembers().find(m => m.id === req.params.id);
  if (!member) return res.status(404).json({ error: 'Filiado não encontrado' });
  res.json(member);
});

// Cadastrar novo filiado
app.post('/api/members', upload.single('photo'), async (req, res) => {
  try {
    const { nome, email, telefone, categoria, cpf } = req.body;
    if (!nome || !categoria) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
    }

    const members = loadMembers();
    const id = uuidv4();
    const numeroFiliacao = String(members.length + 1).padStart(5, '0');
    const cardUrl = `${req.protocol}://${req.get('host')}/card.html?id=${id}`;
    const qrCode = await QRCode.toDataURL(cardUrl);

    const member = {
      id,
      numeroFiliacao,
      nome,
      email: email || '',
      telefone: telefone || '',
      cpf: cpf || '',
      categoria,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
      dataFiliacao: new Date().toISOString(),
      validade: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      ativo: true,
      qrCode,
      cardUrl
    };

    members.push(member);
    saveMembers(members);

    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar filiado
app.put('/api/members/:id', upload.single('photo'), async (req, res) => {
  try {
    const members = loadMembers();
    const idx = members.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Filiado não encontrado' });

    const { nome, email, telefone, categoria, cpf, ativo } = req.body;
    const member = members[idx];

    if (nome) member.nome = nome;
    if (email !== undefined) member.email = email;
    if (telefone !== undefined) member.telefone = telefone;
    if (categoria) member.categoria = categoria;
    if (cpf !== undefined) member.cpf = cpf;
    if (ativo !== undefined) member.ativo = ativo === 'true';
    if (req.file) member.photo = `/uploads/${req.file.filename}`;

    saveMembers(members);
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar filiado
app.delete('/api/members/:id', (req, res) => {
  const members = loadMembers();
  const filtered = members.filter(m => m.id !== req.params.id);
  if (filtered.length === members.length) {
    return res.status(404).json({ error: 'Filiado não encontrado' });
  }
  saveMembers(filtered);
  res.json({ success: true });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Conexão Arq Serra - Cartão Virtual`);
  console.log(`   Servidor rodando em http://localhost:${PORT}`);
  console.log(`   Admin: http://localhost:${PORT}/admin.html`);
  console.log('\nPressione Ctrl+C para encerrar.\n');
});
