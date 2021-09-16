const { Pool } = require('pg');

const pool = new Pool({
  user: 'tapansiwach',
  host: 'localhost',
  database: 'lightbnb'
});

module.exports = { pool };