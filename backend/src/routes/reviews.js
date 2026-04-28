const express = require('express');
const router = express.Router();
const db = require('../config/db');
const config = require('../config/vulnerabilities.json');
const jwt = require('jsonwebtoken');

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Получение конфигурации XSS для отзывов
router.get('/config', (req, res) => {
  res.json({
    xss: {
      enabled: config.xss.enabled,
      types: {
        reviews: config.xss.types.reviews
      }
    }
  });
});

// Получение отзывов для товара
router.get('/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const [reviews] = await db.query(
      `SELECT reviews.id, reviews.text, reviews.date, users.username
       FROM reviews 
       JOIN users ON reviews.user_id = users.id
       WHERE reviews.product_id = ?
       ORDER BY reviews.date DESC`,
      [productId]
    );
    
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавление нового отзыва (требует авторизации)
router.post('/:productId', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    const productId = req.params.productId;
    const userId = req.user.id;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Review text is required' });
    }

    // Вставка отзыва в базу данных
    const [result] = await db.query(
      `INSERT INTO reviews (product_id, user_id, text, date) 
       VALUES (?, ?, ?, NOW())`,
      [productId, userId, text]
    );
    
    // Получение данных добавленного отзыва
    const [newReview] = await db.query(
      `SELECT reviews.id, reviews.text, reviews.date, users.username
       FROM reviews 
       JOIN users ON reviews.user_id = users.id
       WHERE reviews.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(newReview[0]);
  } catch (err) {
    console.error('Error adding review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 