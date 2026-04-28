const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/vulnerabilities.json');

// Путь к директории для загрузки
const uploadDir = path.join(__dirname, '../../frontend/public/uploads/');

// Создаем директорию, если она не существует
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Directory created: ${uploadDir}`);
}

// Определение разрешенных типов файлов
const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif'
};

// Настройка хранилища для загружаемых файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('Destination:', uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        console.log('Original filename:', file.originalname);
        // Сохраняем файл с оригинальным именем
        // В небезопасной конфигурации это может позволить загрузить файл с любым расширением
        cb(null, file.originalname);
    }
});

// Проверка типа файла
const fileFilter = (req, file, cb) => {
    console.log('Checking file:', file.originalname, 'MIME:', file.mimetype);
    
    // Получаем настройки уязвимости
    const vulnConfig = config.fileUpload || { enabled: false, validateFileType: true };
    
    // Если уязвимость включена и проверка типа отключена - пропускаем все файлы
    if (vulnConfig.enabled && !vulnConfig.validateFileType) {
        console.log('УЯЗВИМОСТЬ АКТИВНА: проверка типа файла отключена, принимаем любые файлы');
        cb(null, true);
        return;
    }
    
    // Иначе - проверяем расширение файла
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    const allowedExtensions = vulnConfig.allowedExtensions || ['jpg', 'jpeg', 'png', 'gif'];
    
    if (allowedExtensions.includes(fileExtension)) {
        console.log(`Файл принят: ${file.originalname}`);
        cb(null, true);
    } else {
        console.log(`Файл отклонен: ${file.originalname}`);
        cb(null, false);
        return cb(new Error(`Недопустимый тип файла! Разрешены только следующие типы: ${allowedExtensions.join(', ')}`));
    }
};

// Установка ограничения размера файла (5 МБ по умолчанию)
const maxSize = (config.fileUpload && config.fileUpload.maxSizeKB) ? config.fileUpload.maxSizeKB * 1024 : 5 * 1024 * 1024;

// Создаем middleware для обработки файлов
const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: maxSize }
});

module.exports = upload;