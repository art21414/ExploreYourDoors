// Загрузка данных при старте
async function loadInitialProducts() {
  const response = await fetch('/api/search?keyword=');
  const products = await response.json();
  updateProductGrid(products);
}

// Общая функция для обновления сетки товаров
function updateProductGrid(products) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  products.forEach(product => {
    // Генерируем HTML с условным отображением элементов
    const card = `
      <div class="product-card" data-product-id="${product.id}">
        ${product.image ? 
          `<div class="image-container">
            <img src="images/${product.image}" class="product-image">
          </div>` 
          : ''
        }

        <div class="product-content">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description">${product.description}</p>
        </div>

        <div class="product-footer">
          ${product.price ? 
            `<span class="price">${product.price.toLocaleString()} ₽</span>` 
            : '<div class="empty-price"></div>'
          }
          
          <div class="buttons">
            ${product.price ? '<button class="cart-btn">В корзину</button>' : ''}
            <button class="reviews-btn">Отзывы</button>
          </div>
        </div>
      </div>
    `;

    resultsDiv.insertAdjacentHTML('beforeend', card);
  });
}

// Загрузка данных при старте
loadInitialProducts();

// Обработчик поиска
document.getElementById('keyword').addEventListener('input', async (e) => {
  const keyword = e.target.value;
  const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`);
  const products = await response.json();
  updateProductGrid(products);
});
// Обработчики событий для кнопок "Вход" и "Регистрация"
document.getElementById('loginBtn').addEventListener('click', () => {
  window.location.href = 'login.html'; // Переход на страницу входа
});

document.getElementById('registerBtn').addEventListener('click', () => {
  window.location.href = 'register.html'; // Переход на страницу регистрации
});