from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import os
import logging
from gtts import gTTS
from gigachat_client import GigaChatClient
from langdetect import detect, DetectorFactory, LangDetectException
import json

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Создаем директории если их нет
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
templates_dir = Path("templates")
templates_dir.mkdir(exist_ok=True)

app = FastAPI(title="AI Translator API")

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

# Инициализируем шаблоны
templates = Jinja2Templates(directory="templates")

# Устанавливаем seed для стабильного определения языка
DetectorFactory.seed = 0

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(
        "index.html", 
        {"request": request}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str
    style: str

class TranslationResponse(BaseModel):
    translated_text: str
    detected_language: Optional[str] = None

gigachat = GigaChatClient()

def determine_language(text):
    try:
        if not text.strip():
            return None
            
        detected_lang = detect(text)
        logger.info(f"Detected language: {detected_lang} for text: {text[:50]}...")
        
        # Маппинг кодов языков langdetect в наши коды
        lang_mapping = {
            'zh-cn': 'zh-CN',
            'zh-tw': 'zh-TW',
            'zh': 'zh-CN',  # По умолчанию используем упрощенный китайский
            'en': 'en-US',  # По умолчанию американский английский
            'ru': 'ru',
            'ja': 'ja',
            'ko': 'ko',
            'ar': 'ar',
            'hi': 'hi',
            'de': 'de',
            'es': 'es',
            'fr': 'fr',
            'it': 'it',
            'pt': 'pt',
            'be': 'be',
            'uk': 'uk',
            'kk': 'kk',
            'bn': 'bn'
        }

        mapped_lang = lang_mapping.get(detected_lang, detected_lang)
        
        # Дополнительная проверка для британского английского
        if mapped_lang == 'en-US':
            british_words = ['colour', 'behaviour', 'centre', 'theatre', 'metre', 'litre', 'catalogue']
            text_lower = text.lower()
            if any(word in text_lower for word in british_words):
                mapped_lang = 'en-GB'
                logger.info(f"Detected British English due to specific words")

        return mapped_lang

    except LangDetectException as e:
        logger.error(f"Language detection error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in language detection: {e}")
        return None

@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    try:
        logger.info(f"Получен запрос на перевод: {request.text[:100]}...")
        
        detected_language = None
        if request.source_lang == 'auto':
            detected_language = determine_language(request.text)
            if not detected_language:
                logger.error("Could not detect language")
                raise HTTPException(status_code=400, detail="Could not detect language")
            
            logger.info(f"Определен язык: {detected_language}")
            source_lang = detected_language
        else:
            source_lang = request.source_lang

        prompt = f"""Переведи текст с {source_lang} на {request.target_lang}.
        Стиль перевода: {request.style}
        
        Текст: {request.text}
        """
        
        messages = [{"role": "user", "content": prompt}]
        response = gigachat.send_message(messages)
        
        translated_text = response['choices'][0]['message']['content'].strip()
        logger.info(f"Перевод выполнен успешно")
        
        return TranslationResponse(
            translated_text=translated_text,
            detected_language=detected_language
        )
        
    except Exception as e:
        logger.error(f"Error in translation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/synthesize")
async def synthesize_speech(text: str, lang: str):
    try:
        logger.info(f"Получен запрос на синтез речи для языка: {lang}")
        
        # Создаем временный файл с уникальным именем
        filename = f"speech_{os.urandom(8).hex()}.mp3"
        audio_path = os.path.join("static", filename)
        
        # Конвертируем код языка в формат gTTS
        lang_code = lang.split('-')[0]  # Берем только основной код языка
        
        tts = gTTS(text=text, lang=lang_code)
        tts.save(audio_path)
        
        logger.info(f"Аудио файл создан: {audio_path}")
        
        # Возвращаем URL для доступа к файлу
        return JSONResponse({
            "audio_url": f"/static/{filename}"
        })
        
    except Exception as e:
        logger.error(f"Ошибка при синтезе речи: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Очистка старых аудио файлов
@app.on_event("startup")
async def cleanup_old_audio():
    try:
        for file in static_dir.glob("speech_*.mp3"):
            file.unlink()
        logger.info("Старые аудио файлы очищены")
    except Exception as e:
        logger.error(f"Ошибка при очистке аудио файлов: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
