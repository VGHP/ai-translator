from gigachat_client import GigaChatClient

# Создаем экземпляр клиента (учетные данные будут загружены из .env)
client = GigaChatClient()

# Пример отправки сообщения
messages = [
    {
        "role": "user",
        "content": "Привет! Расскажи о себе."
    }
]

try:
    response = client.send_message(messages)
    print(response['choices'][0]['message']['content'])
except Exception as e:
    print(f"Произошла ошибка: {e}") 