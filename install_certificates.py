import os
import requests
import certifi
import ssl
import urllib3
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_russian_certificates():
    # Отключаем предупреждения о небезопасных запросах
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    # URL сертификатов
    cert_urls = [
        "https://gu-st.ru/content/Other/doc/russian_trusted_root_ca.cer",
        "https://gu-st.ru/content/Other/doc/russian_trusted_sub_ca.cer"
    ]
    
    try:
        cert_path = certifi.where()
        logger.info(f"Путь к сертификатам: {cert_path}")
        
        for cert_url in cert_urls:
            # Загрузка сертификата
            logger.info(f"Загрузка сертификата: {cert_url}")
            response = requests.get(cert_url, verify=False)
            
            if response.status_code == 200:
                # Добавление сертификата
                with open(cert_path, 'ab') as f:
                    f.write(b"\n")  # Добавляем новую строку
                    f.write(response.content)
                logger.info(f"Сертификат успешно добавлен")
            else:
                logger.error(f"Ошибка загрузки сертификата: {response.status_code}")
                
        logger.info("Все сертификаты успешно установлены")
        
    except Exception as e:
        logger.error(f"Ошибка при установке сертификатов: {e}")
        raise

if __name__ == "__main__":
    install_russian_certificates() 