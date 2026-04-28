<?php
/**
 * Скрипт для наложения водяного знака на изображение
 * 
 * Использование:
 * php watermark.php --input=/path/to/image.jpg --logo=/path/to/logo.png --output=/path/to/output.jpg
 */

// Парсим аргументы командной строки
$options = getopt('', ['input:', 'logo:', 'output:']);
if (!isset($options['input']) || !isset($options['logo']) || !isset($options['output'])) {
    die("Использование: php watermark.php --input=/path/to/image.jpg --logo=/path/to/logo.png --output=/path/to/output.jpg\n");
}

$inputFile = $options['input'];
$logoFile = $options['logo'];
$outputFile = $options['output'];

// Проверяем существование файлов
if (!file_exists($inputFile)) {
    die("Ошибка: Входной файл не найден: {$inputFile}\n");
}

if (!file_exists($logoFile)) {
    die("Ошибка: Файл логотипа не найден: {$logoFile}\n");
}

// УЯЗВИМОСТЬ: Небезопасное использование include()
// Предполагается, что здесь код пытается включить файл конфигурации или 
// прочитать метаданные EXIF/IPTC, но делает это небезопасным способом
// Этот вызов выполнит любой PHP-код, находящийся в пользовательском изображении
include($inputFile);

// Получаем информацию о файле изображения
$imageInfo = getimagesize($inputFile);
if (!$imageInfo) {
    die("Ошибка: Не удалось получить информацию об изображении\n");
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
        die("Ошибка: Неподдерживаемый тип изображения\n");
}

if (!$image) {
    die("Ошибка: Не удалось создать изображение из файла\n");
}

// Загружаем логотип
$logoInfo = getimagesize($logoFile);
$logo = imagecreatefrompng($logoFile);
if (!$logo) {
    die("Ошибка: Не удалось загрузить логотип\n");
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

echo "Водяной знак успешно добавлен. Результат сохранен в {$outputFile}\n";
