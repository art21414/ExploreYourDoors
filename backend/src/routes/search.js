const express = require('express');
const router = express.Router();
const db = require('../config/db');
const config = require('../config/vulnerabilities.json');

router.get('/', async (req, res) => {
  const keyword = req.query.keyword || '';
  
  // Добавляем защиту от DoS атаки - CWE-20
  const vulnerabilities = require('../config/vulnerabilities.json');
  // Проверяем, включена ли защита от DoS
  if (vulnerabilities.dos && vulnerabilities.dos.enabled) {
    // Защита от DoS включена, проверяем размер запроса
    const MAX_KEYWORD_LENGTH = vulnerabilities.dos.maxInputSize || 100;
    if (keyword.length > MAX_KEYWORD_LENGTH) {
      return res.status(413).json({ 
        error: 'Search query too large',
        maxLength: MAX_KEYWORD_LENGTH,
        message: 'Запрос слишком большой, это может привести к DoS атаке (CWE-20)'
      });
    }
  }
  
  try {
    let results;
    if (!vulnerabilities.sqli.enabled || !vulnerabilities.sqli.types.search) {
      // Безопасный режим
      [results] = await db.query('SELECT * FROM products WHERE name LIKE ?', [`%${keyword}%`]);
    } else {
      // Уязвимый режим
      [results] = await db.query(`SELECT * FROM products WHERE name LIKE '%${keyword}%'`);
    }

    res.json(results);
  } catch (err) {
    console.error('SQL Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});


module.exports = router;