// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('jwt');
    const usernameSpan = document.getElementById('username');
    const roleSpan = document.getElementById('role');
    const cartBtn = document.getElementById('cartBtn');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        // Декодирование JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        usernameSpan.textContent = payload.username;
        roleSpan.textContent = payload.role || 'user';
        
        // Отображение кнопки корзины
        if (cartBtn) {
            cartBtn.style.display = 'inline-block';
        }
        
        // Загрузка данных профиля
        await loadUserProfile();
    } catch (e) {
        console.error('Invalid token:', e);
        logout();
    }

    // Обработчик кнопки выхода
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

async function loadUserProfile() {
    try {
        const response = await fetch('/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwt')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const data = await response.json();
        
        // Обновляем отображение email
        const userEmailSpan = document.getElementById('userEmail');
        userEmailSpan.textContent = data.email || '-';
        
        // Обновляем аватар пользователя
        const avatarImg = document.getElementById('avatarImg');
        if (data.avatar_path) {
            avatarImg.src = data.avatar_path + '?t=' + new Date().getTime();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function logout() {
    localStorage.removeItem('jwt');
    window.location.href = '/index.html';
}

async function saveChanges() {
    const newEmail = document.getElementById('newEmailInput').value;
    const avatarFile = document.getElementById('avatarInput').files[0];
  
    // Проверяем, есть ли какие-либо изменения
    if (!newEmail && !avatarFile) {
      alert('Нет данных для обновления');
      return;
    }
  
    const formData = new FormData();
    if (newEmail) formData.append('email', newEmail);
    if (avatarFile) formData.append('avatar', avatarFile);
  
    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: formData
      });
  
      if (response.ok) {
        const result = await response.json();
        alert('Изменения сохранены!');

        // Обновляем интерфейс с данными, возвращенными с сервера
        const userEmailSpan = document.getElementById('userEmail');
        userEmailSpan.textContent = result.email || '-';

        // Обновляем аватар с путем с сервера
        const avatarImg = document.getElementById('avatarImg');
        if (result.avatar_path) {
          avatarImg.src = result.avatar_path + '?t=' + new Date().getTime();
        }

        // Очищаем поле ввода новой почты
        document.getElementById('newEmailInput').value = '';
        // Очищаем поле выбора файла
        document.getElementById('avatarInput').value = '';
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка сохранения');
      }
    } catch (err) {
      alert('Ошибка соединения');
      console.error(err);
    }
  }