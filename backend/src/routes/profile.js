const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/fileUpload'); // Импортируем middleware для загрузки файлов
const authenticate = require('../middleware/auth'); // Импортируем middleware для аутентификации
const imageProcessor = require('../services/imageProcessor'); // Импортируем сервис обработки изображений

// Получение данных профиля
router.get('/profile', authenticate, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user.id;
        const [rows] = await db.query('SELECT email, avatar_path FROM users WHERE id = ?', [userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            email: rows[0].email || '',
            avatar_path: rows[0].avatar_path || '/images/default-avatar.jpg'
        });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: err.message });
    }
});

// Обработчик загрузки файлов с аутентификацией
router.post('/update-profile', authenticate, upload.single('avatar'), async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);
        console.log('User:', req.user);
        
        const { email } = req.body;
        const avatar = req.file; // Получаем загруженный файл

        // Проверяем, что пользователь аутентифицирован
        if (!req.user) {
            console.log('User not authenticated');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user.id;
        console.log('User ID:', userId);// Извлекаем userId

        // Получаем текущие данные пользователя
        const [userData] = await db.query('SELECT email, avatar_path FROM users WHERE id = ?', [userId]);
        if (userData.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentEmail = userData[0].email;
        const currentAvatarPath = userData[0].avatar_path;

        // Определяем, какие данные нужно обновить
        const newEmail = email || currentEmail;
        let newAvatarPath = currentAvatarPath;

        if (avatar) {
            // Полный путь к загруженному файлу
            const filePath = avatar.path;
            console.log('Загруженный файл:', filePath);
            
            try {
                // Обрабатываем изображение (добавляем водяной знак)
                const processedPath = await imageProcessor.addWatermark(filePath);
                
                if (processedPath) {
                    console.log('Изображение обработано успешно, новый путь:', processedPath);
                    newAvatarPath = processedPath;
                } else {
                    console.log('Ошибка при обработке изображения, используем оригинал');
                    newAvatarPath = `/uploads/${avatar.filename}`;
                }
            } catch (procError) {
                console.error('Ошибка обработки изображения:', procError);
                newAvatarPath = `/uploads/${avatar.filename}`;
            }
        }

        // Обновление данных в БД
        try {
            await db.query(
                'UPDATE users SET email = ?, avatar_path = ? WHERE id = ?',
                [newEmail, newAvatarPath, userId],
                (error, results, fields) => {
                    if (error) {
                        console.error('SQL Error:', error);
                    } else {
                        console.log('Rows affected:', results.affectedRows);
                    }
                }
            );
        } catch (error) {
            console.error('Error executing database query:', error);
        }

        console.log('Database query executed.');
        res.json({ 
            success: true,
            email: newEmail,
            avatar_path: newAvatarPath
        });
    } catch (err) {
        console.error('Error during file upload:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
