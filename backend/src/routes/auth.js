const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../config/db');
const config = require('../config/vulnerabilities.json');

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Уязвимость CWE-89 (будет добавлена позже)
    const [existing] = await db.query(
      `SELECT * FROM users WHERE username = ?`, 
      [username]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User exists' });
    }

    // CWE-259: Пароль хранится в открытом виде
    await db.query(
      `INSERT INTO users (username, password) VALUES (?, ?)`,
      [username, password]
    );

    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    console.log('Login request body:', req.body); 
    const { username, password } = req.body;
    let users;
    // Уязвимость CWE-89 (пока отключена)
    console.log('Query:', `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`);
    if (config.sqli.enabled && config.sqli.types.auth) {
      // Уязвимый код
      [users] = await db.query(
        `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
      );
    } else {
      // Защищенный код
      [users] = await db.query(
        `SELECT * FROM users WHERE username = ? AND password = ?`,
        [username, password]
      );
    }
    console.log('Result:', users);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

   // Генерация JWT
  console.log('User data for JWT:', users[0]);
  const token = jwt.sign(
    { 
      id: users[0].id, // добавляем id в payload
      username: users[0].username, 
      role: users[0].role 
    }, 
    config.jwt.secret, 
    { expiresIn: '1h' }
  );
  console.log('r JWT:', token);

  res.json({ 
    token, 
    role: users[0].role,
    username: users[0].username 
  });
  } catch (err) {
    console.error('Login error:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;