/**
 * Сервис для обработки загруженных изображений
 * - Изменение размера
 * - Добавление водяного знака
 * - Оптимизация
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('../config/vulnerabilities.json');

/**
 * Добавляет водяной знак на изображение аватара пользователя
 * 
 * @param {string} imagePath Путь к загруженному изображению
 * @returns {Promise<string>} Путь к обработанному изображению
 */
async function addWatermark(imagePath) {
    try {
        console.log(`Обработка изображения: ${imagePath}`);
        
        // Получаем информацию о файле
        const fileInfo = path.parse(imagePath);
        const baseName = path.basename(imagePath);
        const outputName = `watermarked_${baseName}`;
        const outputPath = path.join(fileInfo.dir, outputName);
        
        // Проверяем тип файла перед обработкой
        // Эта проверка включается или отключается в зависимости от настроек безопасности
        const securityConfig = config.imageProcessor || { enabled: false, validateExtension: true };
        
        if (!securityConfig.enabled || validateImageFile(imagePath, securityConfig)) {
            // Путь к логотипу для водяного знака
            const logoPath = path.join(__dirname, '../../assets/logo.png');
            
            // Проверяем существование директории для логотипа
            const logoDir = path.dirname(logoPath);
            if (!fs.existsSync(logoDir)) {
                fs.mkdirSync(logoDir, { recursive: true });
                console.log(`Создана директория для ассетов: ${logoDir}`);
            }
            
            // Проверяем наличие логотипа, если его нет - создаем простой логотип
            if (!fs.existsSync(logoPath)) {
                console.log('Логотип не найден, создаем временный логотип...');
                await createDummyLogo(logoPath);
                console.log(`Временный логотип создан: ${logoPath}`);
            }
            
            // Создаем PHP скрипт для обработки
            const processorScript = path.join(__dirname, '../utils/watermark.php');
            const utilsDir = path.dirname(processorScript);
            if (!fs.existsSync(utilsDir)) {
                fs.mkdirSync(utilsDir, { recursive: true });
            }
            
            if (!fs.existsSync(processorScript)) {
                createWatermarkScript(processorScript);
            }
            
            try {
                // Копируем изображение в выходной файл
                execSync(`cp ${imagePath} ${outputPath}`);
                
                // Напрямую вызываем PHP в контейнере backend
                // Для этого PHP должен быть установлен в контейнере backend
                const command = `php ${processorScript} --input=${imagePath} --logo=${logoPath} --output=${outputPath}`;
                console.log(`Выполняем команду: ${command}`);
                execSync(command);
                
                console.log(`Изображение успешно обработано: ${outputPath}`);
                return `/uploads/${outputName}`;
            } catch (execError) {
                console.error('Ошибка выполнения команды:', execError);
                return `/uploads/${baseName}`;
            }
        } else {
            console.log('Файл не прошел проверку валидации, используем оригинал');
            return `/uploads/${baseName}`;
        }
    } catch (error) {
        console.error('Ошибка при обработке изображения:', error);
        return null;
    }
}

/**
 * Проверяет, является ли файл допустимым изображением
 * 
 * @param {string} filePath Путь к файлу
 * @param {Object} securityConfig Настройки безопасности
 * @returns {boolean} true, если файл прошел проверку
 */
function validateImageFile(filePath, securityConfig) {
    try {
        console.log('Проверка файла на допустимый тип изображения:', filePath);
        
        // Проверка уязвимостей включена?
        if (securityConfig.enabled === false) {
            console.log('Режим безопасности: тщательная проверка отключена');
            return true;
        }
        
        // Получаем расширение файла
        const fileExtension = path.extname(filePath).toLowerCase().substring(1);
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        
        // Проверяем расширение файла только если это включено
        if (securityConfig.validateExtension && !allowedExtensions.includes(fileExtension)) {
            console.log(`Недопустимое расширение файла: ${fileExtension}`);
            return false;
        }
        
        // В режиме уязвимости пропускаем дополнительные проверки
        if (!securityConfig.validateMimeType && !securityConfig.validateImageContent) {
            console.log('Режим уязвимости: пропускаем дополнительные проверки файла');
            
            // В режиме уязвимости разрешаем PHP-файлы, что опасно!
            if (fileExtension === 'php' || fileExtension === 'phtml' || 
                filePath.includes('.php.') || filePath.includes('.phtml.')) {
                console.log('ВНИМАНИЕ: Обнаружен потенциально опасный файл! ' + filePath);
            }
            
            return true;
        }
        
        // Дополнительные проверки для режима безопасности
        // Проверка MIME-типа и содержимого изображения
        // В реальном приложении здесь был бы более сложный код для проверки файла
        
        return true;
    } catch (error) {
        console.error('Ошибка при проверке файла:', error);
        return false;
    }
}

/**
 * Создает временный логотип для тестирования
 * 
 * @param {string} logoPath Путь, куда сохранить логотип
 */
async function createDummyLogo(logoPath) {
    // Создаем простой скрипт PHP для генерации PNG логотипа
    const tempPhpScript = path.join(__dirname, '../utils/create_logo.php');
    const utilsDir = path.dirname(tempPhpScript);
    
    if (!fs.existsSync(utilsDir)) {
        fs.mkdirSync(utilsDir, { recursive: true });
    }
    
    // Создаем PHP скрипт для генерации логотипа
    const phpContent = `<?php
    // Создаем изображение
    $width = 100;
    $height = 100;
    $image = imagecreatetruecolor($width, $height);
    
    // Устанавливаем цвета
    $bg = imagecolorallocatealpha($image, 255, 255, 255, 127); // Прозрачный фон
    $text_color = imagecolorallocate($image, 0, 0, 255); // Синий текст
    
    // Делаем фон прозрачным
    imagefill($image, 0, 0, $bg);
    
    // Добавляем текст
    imagestring($image, 5, 10, 40, "DEMO", $text_color);
    
    // Сохраняем прозрачность
    imagesavealpha($image, true);
    
    // Выводим изображение в файл
    imagepng($image, '${logoPath}');
    
    // Освобождаем память
    imagedestroy($image);
    
    echo "Logo created at ${logoPath}\\n";
    ?>`;
    
    // Записываем скрипт во временный файл
    fs.writeFileSync(tempPhpScript, phpContent);
    
    // Выполняем скрипт для создания логотипа
    try {
        execSync(`php ${tempPhpScript}`);
        console.log(`Логотип создан с помощью PHP: ${logoPath}`);
    } catch (error) {
        console.error('Ошибка при создании логотипа:', error);
    }
}

/**
 * Создает PHP скрипт для наложения водяного знака
 * 
 * @param {string} scriptPath Путь для сохранения скрипта
 */
function createWatermarkScript(scriptPath) {
    // Получаем настройки уязвимости Code Injection
    const codeInjectionConfig = config.code_injection || { enabled: false, include_uploaded_files: false };
    const imageProcessorConfig = config.imageProcessor || { enabled: false, useInclude: false };

    // Формируем код функции checkImageMetadata в зависимости от настроек
    let checkImageMetadataFunction = '';
    
    if (codeInjectionConfig.enabled && imageProcessorConfig.useInclude) {
        // Уязвимая версия с использованием include()
        checkImageMetadataFunction = `
// УЯЗВИМОСТЬ: Небезопасная проверка EXIF-данных изображения
// CWE-94: Эта функция может выполнить PHP-код, внедренный в комментарии изображения
function checkImageMetadata($file) {
    // Получаем первые 100 байт файла для проверки сигнатуры
    $f = fopen($file, 'rb');
    $header = fread($f, 100);
    fclose($f);
    
    // Проверяем, что файл начинается с сигнатуры JPEG
    if (substr($header, 0, 2) === "\\xff\\xd8") {
        echo "Файл проверен - это JPEG изображение\\n";
        
        // КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Включаем содержимое файла для "обработки метаданных"
        // Если файл содержит PHP-код, он будет выполнен!
        include($file);
        
        return true;
    } 
    // Проверяем, что файл начинается с сигнатуры PNG
    else if (substr($header, 0, 8) === "\\x89PNG\\r\\n\\x1a\\n") {
        echo "Файл проверен - это PNG изображение\\n";
        return true;
    } 
    else {
        echo "Предупреждение: файл не распознан как изображение, но обработка продолжается\\n";
        return false;
    }
}`;
    } else {
        // Безопасная версия без использования include()
        checkImageMetadataFunction = `
// Безопасная проверка типа изображения
function checkImageMetadata($file) {
    // Получаем первые 100 байт файла для проверки сигнатуры
    $f = fopen($file, 'rb');
    $header = fread($f, 100);
    fclose($f);
    
    // Проверяем, что файл начинается с сигнатуры JPEG
    if (substr($header, 0, 2) === "\\xff\\xd8") {
        echo "Файл проверен - это JPEG изображение\\n";
        return true;
    } 
    // Проверяем, что файл начинается с сигнатуры PNG
    else if (substr($header, 0, 8) === "\\x89PNG\\r\\n\\x1a\\n") {
        echo "Файл проверен - это PNG изображение\\n";
        return true;
    } 
    else {
        echo "Предупреждение: файл не распознан как изображение, но обработка продолжается\\n";
        return false;
    }
}`;
    }

    // Формируем полный PHP-скрипт
    const phpScript = `<?php
/**
 * Скрипт для наложения водяного знака на изображение
 * 
 * Использование:
 * php watermark.php --input=/path/to/image.jpg --logo=/path/to/logo.png --output=/path/to/output.jpg
 */

// Парсим аргументы командной строки
$options = getopt('', ['input:', 'logo:', 'output:']);
if (!isset($options['input']) || !isset($options['logo']) || !isset($options['output'])) {
    die("Использование: php watermark.php --input=/path/to/image.jpg --logo=/path/to/logo.png --output=/path/to/output.jpg\\n");
}

$inputFile = $options['input'];
$logoFile = $options['logo'];
$outputFile = $options['output'];

// Проверяем существование файлов
if (!file_exists($inputFile)) {
    die("Ошибка: Входной файл не найден: {$inputFile}\\n");
}

if (!file_exists($logoFile)) {
    die("Ошибка: Файл логотипа не найден: {$logoFile}\\n");
}

${checkImageMetadataFunction}

// Проверяем метаданные изображения (здесь потенциальная уязвимость)
checkImageMetadata($inputFile);

// Получаем информацию о файле изображения
$imageInfo = getimagesize($inputFile);
if (!$imageInfo) {
    die("Ошибка: Не удалось получить информацию об изображении\\n");
}

// Создаем изображение на основе входного файла
$image = null;
switch ($imageInfo[2]) {
    case IMAGETYPE_JPEG:
        $image = imagecreatefromjpeg($inputFile);
        break;
    case IMAGETYPE_PNG:
        $image = imagecreatefrompng($inputFile);
        break;
    case IMAGETYPE_GIF:
        $image = imagecreatefromgif($inputFile);
        break;
    default:
        die("Ошибка: Неподдерживаемый тип изображения\\n");
}

if (!$image) {
    die("Ошибка: Не удалось создать изображение из файла\\n");
}

// Загружаем логотип
$logoInfo = getimagesize($logoFile);
$logo = imagecreatefrompng($logoFile);
if (!$logo) {
    die("Ошибка: Не удалось загрузить логотип\\n");
}

// Устанавливаем размер логотипа (20% от размера изображения)
$logoWidth = imagesx($logo);
$logoHeight = imagesy($logo);
$imageWidth = imagesx($image);
$imageHeight = imagesy($image);

$newLogoWidth = $imageWidth * 0.2;
$newLogoHeight = $logoHeight * ($newLogoWidth / $logoWidth);

// Позиция логотипа (правый нижний угол)
$logoX = $imageWidth - $newLogoWidth - 10;
$logoY = $imageHeight - $newLogoHeight - 10;

// Накладываем логотип на изображение
imagecopyresampled(
    $image,
    $logo,
    $logoX,
    $logoY,
    0,
    0,
    $newLogoWidth,
    $newLogoHeight,
    $logoWidth,
    $logoHeight
);

// Сохраняем результат
switch ($imageInfo[2]) {
    case IMAGETYPE_JPEG:
        imagejpeg($image, $outputFile, 90);
        break;
    case IMAGETYPE_PNG:
        imagepng($image, $outputFile);
        break;
    case IMAGETYPE_GIF:
        imagegif($image, $outputFile);
        break;
}

// Освобождаем память
imagedestroy($image);
imagedestroy($logo);

echo "Водяной знак успешно добавлен. Результат сохранен в {$outputFile}\\n";
`;

    fs.writeFileSync(scriptPath, phpScript);
}

module.exports = {
    addWatermark
}; 