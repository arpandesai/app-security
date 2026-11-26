const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = { query: (text, params) => pool.query(text, params), users: { update: (id, fields) => pool.query("UPDATE users SET data = $2 WHERE id = $1", [id, fields]) } };
