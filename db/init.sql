CREATE DATABASE IF NOT EXISTS door_store
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
USE door_store;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image VARCHAR(255)  -- Путь к изображению
);

INSERT INTO products (name, description, price, image) VALUES
('SmartLock Pro', 'Биометрический замок с ИИ-распознаванием, NFC и защитой от взлома', 1200000, 'smart-lock-pro.jpg'),
('Neural Access', 'Интеграция с нейроинтерфейсами. Автоматическая адаптация под пользователя', 950000, 'neural-access.jpg'),
('Quantum Shield', 'Квантовая криптография. Защита от физических и цифровых угроз', 2500000, 'quantum-shield.jpg'),
('HoloGate', 'Голографический портал с 3D-сканированием пространства', 1800000, 'holo-gate.jpg');

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  avatar_path VARCHAR(255)
);

INSERT INTO users (username, password) VALUES
('admin', 'admin123'),
('user1', 'password1');
START TRANSACTION; 
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';
UPDATE users SET role = 'admin' WHERE username = 'admin';
COMMIT;
ALTER TABLE users 
  ADD INDEX idx_username (username),
  ADD INDEX idx_email (email);