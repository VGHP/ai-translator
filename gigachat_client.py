import os
import uuid
import requests
import base64
from datetime import datetime, timedelta
from dotenv import load_dotenv
import certifi
import urllib3
import logging

# Отключаем предупреждения о небезопасных запросах
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class GigaChatClient:
    def __init__(self, credentials=None):
        """
        credentials: строка в формате 'client_id:client_secret' или None для загрузки из .env
        """
        load_dotenv()  # загружаем переменные из .env
        
        if credentials is None:
            client_id = os.getenv('GIGACHAT_CLIENT_ID')
            client_secret = os.getenv('GIGACHAT_CLIENT_SECRET')
            credentials = f"{client_id}:{client_secret}"
            
        self.auth_url = os.getenv('GIGACHAT_AUTH_URL', "https://ngw.devices.sberbank.ru:9443/api/v2/oauth")
        self.api_url = os.getenv('GIGACHAT_API_URL', "https://gigachat.devices.sberbank.ru/api/v1")
        self.credentials = base64.b64encode(credentials.encode()).decode()
        self.access_token = None
        self.token_expires_at = None
        
    def _is_token_valid(self):
        """Проверка действительности токена"""
        if not self.access_token or not self.token_expires_at:
            return False
        return datetime.now() < self.token_expires_at
    
    def get_access_token(self):
        """Получение access token"""
        if self._is_token_valid():
            return self.access_token
            
        headers = {
            'Authorization': f'Basic {self.credentials}',
            'RqUID': str(uuid.uuid4()),
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
        
        data = {
            'scope': 'GIGACHAT_API_PERS'
        }
        
        logger.debug(f"Отправка запроса на получение токена: {self.auth_url}")
        response = requests.post(
            self.auth_url,
            headers=headers,
            data=data,
            verify=False  # Отключаем проверку SSL для тестирования
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.debug(f"Получен ответ: {data}")
            self.access_token = data['access_token']
            expires_in = data.get('expires_in', 1740)
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            logger.debug(f"Токен действителен до: {self.token_expires_at}")
            return self.access_token
        else:
            logger.error(f"Ошибка получения токена: {response.text}")
            raise Exception(f"Ошибка получения токена: {response.text}")
    
    def send_message(self, messages):
        """Отправка сообщения в GigaChat"""
        if not self._is_token_valid():
            self.get_access_token()
            
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        data = {
            "model": os.getenv('GIGACHAT_MODEL', "GigaChat:latest"),
            "messages": messages,
            "temperature": float(os.getenv('GIGACHAT_TEMPERATURE', 0.7)),
            "max_tokens": int(os.getenv('GIGACHAT_MAX_TOKENS', 512))
        }
        
        response = requests.post(
            f"{self.api_url}/chat/completions",
            headers=headers,
            json=data,
            verify=False  # Отключаем проверку SSL для тестирования
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Ошибка отправки сообщения: {response.text}") 