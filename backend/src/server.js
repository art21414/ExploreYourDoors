const express = require('express');
const app = express();
const searchRouter = require('./routes/search');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const reviewsRoutes = require('./routes/reviews');
const fileUpload = require('./middleware/fileUpload');
const vulnerabilities = require('./config/vulnerabilities.json');

// Добавляем защиту от DoS - ограничиваем размер запросов
if (vulnerabilities.dos && vulnerabilities.dos.enabled) {
  // Если защита от DoS включена в конфигурации
  const limit = vulnerabilities.dos.globalLimitMB || '1mb';
  console.log(`DoS protection enabled with global limit: ${limit}`);
  app.use(express.json({ limit }));
  app.use(express.urlencoded({ extended: true, limit }));
} else {
  // Защита от DoS выключена - без ограничений размера
  console.log('DoS protection disabled - no size limits enforced');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}

app.use(cors({
  origin: 'http://localhost',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Добавляем диагностический эндпоинт
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is running',
    dosProtection: vulnerabilities.dos && vulnerabilities.dos.enabled ? 'enabled' : 'disabled'
  });
});

app.use('/api/search', searchRouter);
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/reviews', reviewsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});