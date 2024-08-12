const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3001;

// Configuração do banco de dados
const db = mysql.createPool({
    host: 'b9lsqlxrc1wrcggnqosi-mysql.services.clever-cloud.com',
    user: 'ugcnyroeqou4hr6n',
    password: 'fmIducXVC9LOVxi6KgPB',
    database: 'b9lsqlxrc1wrcggnqosi'
});

// Cache em memória
const cache = new Map();

// Função para buscar transações com paginação
async function buscarTransacoes(nomeDoItem = '', page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const cacheKey = `${nomeDoItem}:${page}:${limit}`;
    const cachedTransacoes = cache.get(cacheKey);

    if (cachedTransacoes) {
        return cachedTransacoes;
    }

    const [rows] = await db.query(
        `SELECT id, tipo, forma_pagamento, valor, NOME_DO_ITEM, DATE_FORMAT(data, '%Y-%m-%d') AS data
         FROM transacoes
         WHERE NOME_DO_ITEM LIKE ?
         LIMIT ? OFFSET ?`,
        [`%${nomeDoItem}%`, limit, offset]
    );

    cache.set(cacheKey, rows); // Cache com duração em memória
    return rows;
}

// Rota para listagem de transações
app.get('/', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const nomeDoItem = req.query.nome_do_item || '';

    try {
        const transacoes = await buscarTransacoes(nomeDoItem, parseInt(page), parseInt(limit));
        res.render('app', {
            transacoes: transacoes,
            nome_do_item: nomeDoItem,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar transações.');
    }
});

// Rota para editar transação
app.get('/edit-transacao/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('SELECT * FROM transacoes WHERE id = ?', [id]);
        if (result.length > 0) {
            res.render('edit', { transacao: result[0] });
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar transação.');
    }
});

// Rota para adicionar transação
app.post('/add-transacao', async (req, res) => {
    const { tipo, valor, data, forma_pagamento, nome_do_item } = req.body;
    try {
        await db.query(
            'INSERT INTO transacoes (tipo, valor, data, forma_pagamento, NOME_DO_ITEM, fechado) VALUES (?, ?, ?, ?, ?, FALSE)',
            [tipo, valor, data, forma_pagamento, nome_do_item]
        );
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao adicionar transação.');
    }
});

// Rota para atualizar transação
app.post('/update-transacao', async (req, res) => {
    const { id, nome_do_item, tipo, valor, data, forma_pagamento } = req.body;
    try {
        await db.query(
            'UPDATE transacoes SET tipo = ?, valor = ?, data = ?, forma_pagamento = ?, NOME_DO_ITEM = ? WHERE id = ?',
            [tipo, valor, data, forma_pagamento, nome_do_item, id]
        );
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao atualizar transação.');
    }
});

// Rota para deletar transação
app.post('/delete-transacao', async (req, res) => {
    const { id } = req.body;
    try {
        await db.query('DELETE FROM transacoes WHERE id = ?', [id]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao deletar transação.');
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`); 
});

