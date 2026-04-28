-- Создание таблицы отзывов
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  text TEXT NOT NULL,
  date DATETIME NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Добавление тестовых отзывов для демонстрации
INSERT INTO reviews (product_id, user_id, text, date) VALUES
(1, 1, 'Отличная дверь! Качество на высоте.', NOW() - INTERVAL 5 DAY),
(1, 2, 'Доставили быстро, установка прошла легко.', NOW() - INTERVAL 3 DAY),
(2, 1, 'Хорошее соотношение цена-качество.', NOW() - INTERVAL 2 DAY),
(3, 2, 'Дверь соответствует описанию. Рекомендую!', NOW() - INTERVAL 1 DAY); 