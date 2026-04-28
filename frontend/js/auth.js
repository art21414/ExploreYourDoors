// Обновление интерфейса
function updateUI() {
  const token = localStorage.getItem('jwt');
  const elements = {
      loginBtn: document.getElementById('loginBtn'),
      registerBtn: document.getElementById('registerBtn'),
      cartBtn: document.getElementById('cartBtn'),
      profileBtn: document.getElementById('profileBtn')
  };

  for (const [key, element] of Object.entries(elements)) {
      if (element) {
          element.style.display = token ? 
              (key === 'loginBtn' || key === 'registerBtn' ? 'none' : 'inline-block') : 
              (key === 'loginBtn' || key === 'registerBtn' ? 'inline-block' : 'none');
      }
  }
}

// Валидация полей формы
function validateInput(input, errorMessage, validationFn) {
  const isValid = validationFn(input.value);
  const errorElement = input.nextElementSibling;
  
  if (!isValid) {
    input.classList.add('error');
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.style.display = 'block';
    }
  } else {
    input.classList.remove('error');
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.style.display = 'none';
    }
  }
  
  return isValid;
}

// Добавление валидации для формы входа
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  // Валидация при вводе
  usernameInput?.addEventListener('input', () => {
    validateInput(usernameInput, 'Пожалуйста, введите имя пользователя', value => value.trim().length > 0);
  });
  
  passwordInput?.addEventListener('input', () => {
    validateInput(passwordInput, 'Пожалуйста, введите пароль', value => value.trim().length > 0);
  });
  
  // Обработка входа
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Валидация перед отправкой
    const isUsernameValid = validateInput(usernameInput, 'Пожалуйста, введите имя пользователя', value => value.trim().length > 0);
    const isPasswordValid = validateInput(passwordInput, 'Пожалуйста, введите пароль', value => value.trim().length > 0);
    
    if (!isUsernameValid || !isPasswordValid) {
      return;
    }

    const formData = new FormData(e.target);

    try {
        const response = await fetch('http://localhost/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка авторизации:', errorData);
            alert(errorData.error || 'Ошибка авторизации');
            return;
        }

        const data = await response.json();
        console.log('Login response:', data);

        if (data.token) {
            localStorage.setItem('jwt', data.token);
            
            // Перенаправляем ДО вызова updateUI()
            if (data.role === 'admin') {
                console.log('Перенаправление на админ панель');
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/index.html'; // Здесь updateUI() вызовется при загрузке страницы
            }
        } else {
            alert('Ошибка: токен не получен');
        }

    } catch (err) {
        console.error('Ошибка:', err);
        alert('Ошибка соединения');
    }
  });
}

// Добавление валидации для формы регистрации
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('password-confirm');
  
  // Валидация при вводе
  usernameInput?.addEventListener('input', () => {
    validateInput(usernameInput, 'Имя пользователя должно содержать не менее 3 символов', value => value.trim().length >= 3);
  });
  
  passwordInput?.addEventListener('input', () => {
    validateInput(passwordInput, 'Пароль должен содержать не менее 6 символов', value => value.trim().length >= 6);
    
    // Проверка совпадения паролей при изменении основного пароля
    if (passwordConfirmInput && passwordConfirmInput.value) {
      validateInput(
        passwordConfirmInput, 
        'Пароли не совпадают', 
        value => value === passwordInput.value
      );
    }
  });
  
  passwordConfirmInput?.addEventListener('input', () => {
    validateInput(
      passwordConfirmInput, 
      'Пароли не совпадают', 
      value => value === passwordInput.value
    );
  });
  
  // Обработка регистрации
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Валидация перед отправкой
    const isUsernameValid = validateInput(usernameInput, 'Имя пользователя должно содержать не менее 3 символов', value => value.trim().length >= 3);
    const isPasswordValid = validateInput(passwordInput, 'Пароль должен содержать не менее 6 символов', value => value.trim().length >= 6);
    
    let isPasswordConfirmValid = true;
    if (passwordConfirmInput) {
      isPasswordConfirmValid = validateInput(
        passwordConfirmInput, 
        'Пароли не совпадают', 
        value => value === passwordInput.value
      );
    }
    
    if (!isUsernameValid || !isPasswordValid || !isPasswordConfirmValid) {
      return;
    }
    
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('http://localhost/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password')
        })
      });

      if (response.ok) {
        alert('Регистрация успешна! Теперь вы можете войти в систему.');
        window.location.href = '/login.html';
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при регистрации');
      }
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка соединения');
    }
  });
}

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', updateUI);