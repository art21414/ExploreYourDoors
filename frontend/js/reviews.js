// Глобальные переменные
let currentProductId = null;
let reviewsModal = null;
let reviewsList = null;

// Создание модального окна при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Создаем модальное окно и добавляем его в DOM
  createReviewsModal();
  
  // Добавляем делегирование событий на контейнер товаров
  // Это решит проблему с кнопками, которые добавляются динамически
  document.getElementById('results').addEventListener('click', (event) => {
    if (event.target.classList.contains('reviews-btn')) {
      const productCard = event.target.closest('.product-card');
      if (productCard) {
        const productId = productCard.dataset.productId;
        openReviewsModal(productId);
      }
    }
  });
});

// Функция создания модального окна
function createReviewsModal() {
  // Создаем элементы модального окна
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.display = 'none';
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  
  // Создаем заголовок модального окна
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  
  const modalTitle = document.createElement('h2');
  modalTitle.className = 'modal-title';
  modalTitle.textContent = 'Отзывы о товаре';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'close-modal';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', closeReviewsModal);
  
  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeButton);
  
  // Создаем список отзывов
  const reviews = document.createElement('div');
  reviews.className = 'reviews-list';
  
  // Создаем форму добавления отзыва
  const reviewForm = document.createElement('div');
  reviewForm.className = 'review-form';
  
  const textarea = document.createElement('textarea');
  textarea.className = 'review-textarea';
  textarea.placeholder = 'Напишите ваш отзыв...';
  textarea.addEventListener('input', validateReviewInput);
  
  const submitButton = document.createElement('button');
  submitButton.className = 'submit-review';
  submitButton.textContent = 'Отправить отзыв';
  submitButton.disabled = true;
  submitButton.addEventListener('click', submitReview);
  
  reviewForm.appendChild(textarea);
  reviewForm.appendChild(submitButton);
  
  // Собираем модальное окно
  modal.appendChild(modalHeader);
  modal.appendChild(reviews);
  modal.appendChild(reviewForm);
  modalOverlay.appendChild(modal);
  
  // Добавляем модальное окно в DOM
  document.body.appendChild(modalOverlay);
  
  // Сохраняем ссылки на элементы
  reviewsModal = modalOverlay;
  reviewsList = reviews;
}

// Открытие модального окна с отзывами
async function openReviewsModal(productId) {
  currentProductId = productId;
  
  // Очищаем список отзывов
  reviewsList.innerHTML = 'Загрузка отзывов...';
  
  // Отображаем модальное окно
  reviewsModal.style.display = 'flex';
  
  // Загружаем отзывы с сервера
  await loadReviews(productId);
}

// Закрытие модального окна с отзывами
function closeReviewsModal() {
  reviewsModal.style.display = 'none';
  // Сбрасываем текущий ID продукта
  currentProductId = null;
  // Очищаем форму отзыва
  const textarea = reviewsModal.querySelector('.review-textarea');
  textarea.value = '';
  const submitButton = reviewsModal.querySelector('.submit-review');
  submitButton.disabled = true;
}

// Загрузка отзывов с сервера
async function loadReviews(productId) {
  try {
    const response = await fetch(`/api/reviews/${productId}`);
    if (!response.ok) {
      throw new Error('Ошибка при загрузке отзывов');
    }
    
    const reviews = await response.json();
    displayReviews(reviews);
  } catch (error) {
    console.error('Ошибка:', error);
    reviewsList.innerHTML = '<div class="error">Не удалось загрузить отзывы</div>';
  }
}

// Получение конфигурации XSS
async function getXSSConfig() {
  try {
    const response = await fetch('/api/reviews/config');
    if (!response.ok) {
      throw new Error('Не удалось получить конфигурацию');
    }
    const config = await response.json();
    console.log('XSS конфигурация:', config); // Отладка
    return config;
  } catch (error) {
    console.error('Ошибка при получении конфигурации XSS:', error);
    return { xss: { enabled: false } };
  }
}

// Отображение отзывов в модальном окне
async function displayReviews(reviews) {
  // Очищаем список отзывов
  reviewsList.innerHTML = '';
  
  if (reviews.length === 0) {
    reviewsList.innerHTML = '<div class="no-reviews">Отзывов пока нет. Будьте первым!</div>';
    return;
  }
  
  try {
    // Получаем конфигурацию XSS
    const config = await getXSSConfig();
    
    // Выводим конфигурацию в консоль для отладки
    console.log('Используемая конфигурация XSS:', config);
    
    // Проверяем флаг XSS
    const xssEnabled = config.xss && config.xss.enabled && config.xss.types && config.xss.types.reviews;
    console.log('XSS включен:', xssEnabled);
    
    // Добавляем каждый отзыв в список
    reviews.forEach(review => {
      const reviewElement = document.createElement('div');
      reviewElement.className = 'review-item';
      
      // Создаем заголовок отзыва
      const reviewHeader = document.createElement('div');
      reviewHeader.className = 'review-header';
      
      const username = document.createElement('span');
      username.className = 'review-username';
      username.textContent = review.username;
      
      const date = document.createElement('span');
      date.className = 'review-date';
      date.textContent = new Date(review.date).toLocaleString();
      
      reviewHeader.appendChild(username);
      reviewHeader.appendChild(date);
      
      // Добавляем заголовок в элемент отзыва
      reviewElement.appendChild(reviewHeader);
      
      // Создаем содержимое отзыва с учетом XSS
      if (xssEnabled) {
        // Уязвимый вариант - прямое внедрение HTML
        console.log('Применяем уязвимый вариант для отзыва:', review.text);
        reviewElement.innerHTML += `<div class="review-text">${review.text}</div>`;
      } else {
        // Безопасный вариант - использование textContent
        const reviewText = document.createElement('div');
        reviewText.className = 'review-text';
        reviewText.textContent = review.text;
        reviewElement.appendChild(reviewText);
      }
      
      // Добавляем отзыв в список
      reviewsList.appendChild(reviewElement);
    });
  } catch (error) {
    console.error('Ошибка при отображении отзывов:', error);
    
    // Запасной вариант при ошибке - безопасное отображение
    reviews.forEach(review => {
      const reviewElement = document.createElement('div');
      reviewElement.className = 'review-item';
      
      const reviewHeader = document.createElement('div');
      reviewHeader.className = 'review-header';
      
      const username = document.createElement('span');
      username.className = 'review-username';
      username.textContent = review.username;
      
      const date = document.createElement('span');
      date.className = 'review-date';
      date.textContent = new Date(review.date).toLocaleString();
      
      reviewHeader.appendChild(username);
      reviewHeader.appendChild(date);
      
      const reviewText = document.createElement('div');
      reviewText.className = 'review-text';
      reviewText.textContent = review.text;
      
      reviewElement.appendChild(reviewHeader);
      reviewElement.appendChild(reviewText);
      reviewsList.appendChild(reviewElement);
    });
  }
}

// Валидация ввода в поле отзыва
function validateReviewInput(event) {
  const textarea = event.target;
  const submitButton = reviewsModal.querySelector('.submit-review');
  submitButton.disabled = textarea.value.trim() === '';
}

// Отправка нового отзыва
async function submitReview() {
  // Получаем текст отзыва
  const textarea = reviewsModal.querySelector('.review-textarea');
  const reviewText = textarea.value.trim();
  
  // Проверяем авторизацию
  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Для добавления отзыва необходимо авторизоваться');
    return;
  }
  
  // Блокируем кнопку отправки
  const submitButton = reviewsModal.querySelector('.submit-review');
  submitButton.disabled = true;
  
  try {
    // Отправляем отзыв на сервер
    const response = await fetch(`/api/reviews/${currentProductId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: reviewText })
    });
    
    if (!response.ok) {
      throw new Error('Ошибка при отправке отзыва');
    }
    
    // Получаем данные созданного отзыва
    const newReview = await response.json();
    
    // Очищаем форму
    textarea.value = '';
    
    // Обновляем список отзывов
    await loadReviews(currentProductId);
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Не удалось отправить отзыв');
  } finally {
    // Разблокируем кнопку отправки
    submitButton.disabled = false;
  }
} 