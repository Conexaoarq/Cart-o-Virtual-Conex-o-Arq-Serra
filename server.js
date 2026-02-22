const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cria a tabela se não existir
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id              TEXT    PRIMARY KEY,
      numero_filiacao TEXT    NOT NULL,
      nome            TEXT    NOT NULL,
      email           TEXT    DEFAULT '',
      telefone        TEXT    DEFAULT '',
      categoria       TEXT    NOT NULL,
      validade        TEXT    DEFAULT '',
      data_filiacao   TIMESTAMPTZ DEFAULT NOW(),
      ativo           BOOLEAN DEFAULT TRUE,
      qr_code         TEXT,
      card_url        TEXT
    );
  `);
  console.log('✅ Tabela members pronta');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
function basicAuth(req, res, next) {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login === 'administrador' && password === 'conexao2026') {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Acesso Restrito ao Painel Admin"');
  res.status(401).send('Acesso Negado. Credenciais invalidas.');
}

app.use(cors());
app.use(express.json());

// Proteger a página do painel admin
app.use('/admin.html', basicAuth);

// Proteger rotas de modificação na API de membros
app.use('/api/members', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    return basicAuth(req, res, next);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Helper: converte linha do banco para objeto da API ───────────────────────
function rowToMember(row) {
  return {
    id: row.id,
    numeroFiliacao: row.numero_filiacao,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    categoria: row.categoria,
    validade: row.validade,
    dataFiliacao: row.data_filiacao,
    ativo: row.ativo,
    qrCode: row.qr_code,
    cardUrl: row.card_url,
  };
}

// ─── Rotas da API ─────────────────────────────────────────────────────────────

// Listar todos os filiados
app.get('/api/members', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM members ORDER BY data_filiacao ASC');
    res.json(rows.map(rowToMember));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar filiados' });
  }
});

// Buscar filiado por ID
app.get('/api/members/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM members WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Filiado não encontrado' });
    res.json(rowToMember(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar filiado' });
  }
});

// Cadastrar novo filiado
app.post('/api/members', async (req, res) => {
  try {
    const { nome, email, telefone, categoria, validade } = req.body;
    if (!nome || !categoria) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
    }

    const id = uuidv4();
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM members');
    const numeroFiliacao = String(Number(countRows[0].count) + 1).padStart(5, '0');
    const cardUrl = `${req.protocol}://${req.get('host')}/card.html?id=${id}`;
    const qrCode = await QRCode.toDataURL(cardUrl);

    const { rows } = await pool.query(
      `INSERT INTO members (id, numero_filiacao, nome, email, telefone, categoria, validade, qr_code, card_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, numeroFiliacao, nome, email || '', telefone || '', categoria, validade || '', qrCode, cardUrl]
    );

    res.status(201).json(rowToMember(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar filiado
app.put('/api/members/:id', async (req, res) => {
  try {
    const { nome, email, telefone, categoria, validade, ativo } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (nome) { fields.push(`nome = $${i++}`); values.push(nome); }
    if (email !== undefined) { fields.push(`email = $${i++}`); values.push(email); }
    if (telefone !== undefined) { fields.push(`telefone = $${i++}`); values.push(telefone); }
    if (categoria) { fields.push(`categoria = $${i++}`); values.push(categoria); }
    if (validade !== undefined) { fields.push(`validade = $${i++}`); values.push(validade); }
    if (ativo !== undefined) { fields.push(`ativo = $${i++}`); values.push(ativo === 'true' || ativo === true); }

    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE members SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (!rows.length) return res.status(404).json({ error: 'Filiado não encontrado' });
    res.json(rowToMember(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar filiado
app.delete('/api/members/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Filiado não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir filiado' });
  }
});

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Conexão Arq Serra - Cartão Virtual`);
      console.log(`   Servidor rodando em http://localhost:${PORT}`);
      console.log(`   Admin: http://localhost:${PORT}/admin.html`);
      console.log('\nPressione Ctrl+C para encerrar.\n');
    });
  })
  .catch(err => {
    console.error('❌ Erro ao iniciar banco de dados:', err);
    process.exit(1);
  });
