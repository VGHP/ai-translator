from typing import Optional, Dict, List
from gigachat_auth import GigaChatAuth
import json

class AITranslator:
    """Класс для управления переводом текста с использованием GigaChat API"""
    
    TRANSLATION_STYLES = {
        "formal": "Переведи текст в формальном стиле, используя деловой язык",
        "informal": "Переведи текст в неформальном, разговорном стиле",
        "business": "Переведи текст в деловом стиле, используя профессиональную терминологию",
        "flirt": "Переведи текст в игривом, флиртующем стиле"
    }
    
    def __init__(self):
        self.giga = GigaChatAuth()
        
    def translate(self, text: str, 
                 source_lang: str, 
                 target_lang: str, 
                 style: str = "formal") -> Dict[str, str]:
        """
        Перевод текста с учетом стиля
        
        Args:
            text: Исходный текст
            source_lang: Исходный язык
            target_lang: Целевой язык
            style: Стиль перевода (formal/informal/business/flirt)
        
        Returns:
            Dict с переведенным текстом и метаданными
        """
        self.giga.logger.info(f"Начало перевода. Текст: '{text}', из {source_lang} в {target_lang}, стиль: {style}")
        
        style_prompt = self.TRANSLATION_STYLES.get(
            style, 
            self.TRANSLATION_STYLES["formal"]
        )
        
        prompt = f"""
        {style_prompt}.
        Исходный язык: {source_lang}
        Целевой язык: {target_lang}
        
        Текст для перевода:
        {text}
        
        Верни ответ строго в формате JSON:
        {{
            "translation": "переведенный текст",
            "source_lang": "{source_lang}",
            "target_lang": "{target_lang}",
            "style": "{style}"
        }}
        """
        
        self.giga.logger.info(f"Отправляем промпт: {prompt}")
        
        try:
            response = self.giga.send_message(prompt)
            self.giga.logger.info(f"Получен ответ от API: {response}")
            
            content = response["choices"][0]["message"]["content"]
            self.giga.logger.info(f"Извлечено содержимое ответа: {content}")
            
            try:
                translation_data = json.loads(content)
                self.giga.logger.info(f"JSON успешно распарсен: {translation_data}")
                
                # Проверяем наличие всех необходимых полей
                required_fields = ["translation", "source_lang", "target_lang", "style"]
                missing_fields = [field for field in required_fields if field not in translation_data]
                
                if missing_fields:
                    raise Exception(f"В ответе отсутствуют обязательные поля: {missing_fields}")
                
                return translation_data
                
            except json.JSONDecodeError as e:
                self.giga.logger.error(f"Ошибка парсинга JSON. Содержимое: {content}")
                raise Exception(f"Неверный формат ответа от API: {e}")
            
        except Exception as e:
            self.giga.logger.error(f"Ошибка при переводе текста '{text}': {str(e)}")
            raise
            
    def detect_language(self, text: str) -> str:
        """Определение языка текста"""
        prompt = f"""
        Определи язык следующего текста и верни только код языка (например, ru, en, es):
        {text}
        """
        
        try:
            response = self.giga.send_message(prompt)
            return response["choices"][0]["message"]["content"].strip()
        except Exception as e:
            self.giga.logger.error(f"Ошибка при определении языка: {e}")
            raise 