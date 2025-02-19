document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        translateBtn: document.getElementById('translateBtn'),
        clearBtn: document.getElementById('clearBtn'),
        copyBtn: document.getElementById('copyBtn'),
        voiceInputBtn: document.getElementById('voiceInput'),
        playTranslationBtn: document.getElementById('playTranslation'),
        sourceText: document.getElementById('sourceText'),
        translatedText: document.getElementById('translatedText'),
        sourceLang: document.getElementById('sourceLang'),
        targetLang: document.getElementById('targetLang'),
        style: document.getElementById('style')
    };
    
    let isRecording = false;
    let recognition = null;

    // Инициализация распознавания речи
    if (window.webkitSpeechRecognition || window.SpeechRecognition) {
        recognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            elements.voiceInputBtn.classList.add('recording');
            elements.voiceInputBtn.innerHTML = '<i class="fas fa-stop"></i>';
        };

        recognition.onend = () => {
            isRecording = false;
            elements.voiceInputBtn.classList.remove('recording');
            elements.voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            elements.voiceInputBtn.classList.remove('recording');
            elements.voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            
            const errorMessages = {
                'not-allowed': 'Доступ к микрофону запрещен. Пожалуйста, разрешите доступ в настройках браузера.',
                'no-speech': 'Речь не распознана. Попробуйте еще раз.',
                'network': 'Проверьте подключение к интернету.'
            };
            
            alert(errorMessages[event.error] || `Ошибка распознавания речи: ${event.error}`);
        };

        recognition.onresult = (event) => {
            elements.sourceText.value = event.results[0][0].transcript;
            elements.translateBtn.click();
        };
    }

    // Обработчики событий
    elements.voiceInputBtn.addEventListener('click', handleVoiceInput);
    elements.style.addEventListener('change', handleStyleChange);
    elements.translateBtn.addEventListener('click', performTranslation);
    elements.clearBtn.addEventListener('click', handleClear);
    elements.copyBtn.addEventListener('click', handleCopy);
    elements.playTranslationBtn.addEventListener('click', handlePlayTranslation);
    elements.targetLang.addEventListener('change', handleStyleChange);
    elements.sourceLang.addEventListener('change', updateStyleLabels);

    // Инициализация видеофона
    initVideoBackground();

    // Функции обработчики
    async function handleVoiceInput() {
        if (!recognition) {
            alert('Голосовой ввод не поддерживается вашим браузером');
            return;
        }

        if (!isRecording) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Маппинг языков для корректного распознавания речи
                const langMapping = {
                    'auto': 'ru-RU',
                    'ru': 'ru-RU',
                    'en-GB': 'en-GB',
                    'en-US': 'en-US',
                    'zh-CN': 'zh-CN',
                    'zh-TW': 'zh-TW',
                    'ja': 'ja-JP',
                    'ko': 'ko-KR',
                    'ar': 'ar-SA',
                    'hi': 'hi-IN',
                    'de': 'de-DE',
                    'es': 'es-ES',
                    'fr': 'fr-FR',
                    'it': 'it-IT',
                    'pt': 'pt-PT',
                    'be': 'be-BY',
                    'uk': 'uk-UA',
                    'kk': 'kk-KZ',
                    'bn': 'bn-IN'
                };

                recognition.lang = langMapping[elements.sourceLang.value] || 'en-US';
                recognition.start();
            } catch (err) {
                console.error('Ошибка доступа к микрофону:', err);
                const errorMessage = err.name === 'NotAllowedError' 
                    ? 'Для голосового ввода необходимо разрешить доступ к микрофону в настройках браузера'
                    : 'Не удалось получить доступ к микрофону. Проверьте подключение микрофона и настройки браузера.';
                alert(errorMessage);
            }
        } else {
            try {
                recognition.stop();
            } catch (err) {
                console.error('Ошибка остановки распознавания:', err);
            }
        }
    }

    function handleStyleChange() {
        if (elements.sourceText.value.trim()) {
            elements.translateBtn.click();
        }
    }

    async function performTranslation() {
        if (!elements.sourceText.value.trim()) return;
        
        elements.translateBtn.disabled = true;
        const originalBtnText = elements.translateBtn.innerHTML;
        elements.translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Переводим...';
        
        try {
            // Сначала сбрасываем селектор в состояние автоопределения
            if (elements.sourceLang.value !== 'auto') {
                elements.sourceLang.value = 'auto';
                updateStyleLabels();
            }

            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: elements.sourceText.value,
                    source_lang: 'auto', // Всегда отправляем как auto
                    target_lang: elements.targetLang.value,
                    style: elements.style.value
                })
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            elements.translatedText.value = data.translated_text;
            
            // Обновляем язык в селекторе после получения ответа
            if (data.detected_language) {
                const sourceLangSelect = document.getElementById('sourceLang');
                const option = sourceLangSelect.querySelector(`option[value="${data.detected_language}"]`);
                
                if (option) {
                    sourceLangSelect.value = data.detected_language;
                    sourceLangSelect.style.transition = 'all 0.3s ease';
                    sourceLangSelect.style.borderColor = 'var(--neon-blue)';
                    sourceLangSelect.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.3)';
                    
                    setTimeout(() => {
                        sourceLangSelect.style.borderColor = '';
                        sourceLangSelect.style.boxShadow = '';
                    }, 1500);

                    updateStyleLabels();
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            elements.translatedText.value = 'Произошла ошибка при переводе';
            alert('Ошибка при переводе: ' + error.message);
        } finally {
            elements.translateBtn.disabled = false;
            elements.translateBtn.innerHTML = originalBtnText;
        }
    }

    // Новая функция для обновления селектора языка
    function updateSourceLanguageSelector(detectedLang) {
        const sourceLangSelect = document.getElementById('sourceLang');
        const option = sourceLangSelect.querySelector(`option[value="${detectedLang}"]`);
        
        if (option) {
            // Сохраняем текущее значение
            const currentValue = sourceLangSelect.value;
            
            // Если значение изменилось, обновляем селектор
            if (currentValue !== detectedLang) {
                console.log(`Обновление языка: ${currentValue} -> ${detectedLang}`);
                
                // Обновляем значение селектора
                sourceLangSelect.value = detectedLang;
                
                // Добавляем визуальный эффект
                sourceLangSelect.style.transition = 'all 0.3s ease';
                sourceLangSelect.style.borderColor = 'var(--neon-blue)';
                sourceLangSelect.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.3)';
                
                // Сбрасываем эффект через 1.5 секунды
                setTimeout(() => {
                    sourceLangSelect.style.borderColor = '';
                    sourceLangSelect.style.boxShadow = '';
                }, 1500);

                // Обновляем метки стилей
                updateStyleLabels();
                
                // Добавляем событие изменения для корректной работы других компонентов
                sourceLangSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    function handleClear() {
        elements.sourceText.value = '';
        elements.translatedText.value = '';
        elements.sourceText.focus();
        
        // Возвращаем селектор в состояние автоопределения
        const sourceLangSelect = document.getElementById('sourceLang');
        sourceLangSelect.value = 'auto';
        updateStyleLabels();
    }

    async function handleCopy() {
        if (!elements.translatedText.value) return;
        
        try {
            await navigator.clipboard.writeText(elements.translatedText.value);
            const originalText = elements.copyBtn.innerHTML;
            elements.copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                elements.copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Ошибка при копировании:', err);
            alert('Не удалось скопировать текст');
        }
    }

    function handlePlayTranslation() {
        if (!elements.translatedText.value) return;
        
        try {
            const utterance = new SpeechSynthesisUtterance(elements.translatedText.value);
            const langMapping = {
                'ru': 'ru-RU',
                'en-GB': 'en-GB',
                'en-US': 'en-US',
                'zh-CN': 'zh-CN',
                'zh-TW': 'zh-TW',
                'ja': 'ja-JP',
                'ko': 'ko-KR',
                'ar': 'ar-SA',
                'hi': 'hi-IN',
                'de': 'de-DE',
                'es': 'es-ES',
                'fr': 'fr-FR',
                'it': 'it-IT',
                'pt': 'pt-PT',
                'be': 'be-BY',
                'uk': 'uk-UA',
                'kk': 'kk-KZ',
                'bn': 'bn-IN'
            };
            
            utterance.lang = langMapping[elements.targetLang.value] || elements.targetLang.value;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Ошибка при воспроизведении:', error);
            alert('Не удалось воспроизвести текст');
        }
    }

    function initVideoBackground() {
        const videoBackground = document.querySelector('.video-background');
        if (videoBackground) {
            videoBackground.play().catch(error => {
                console.log('Ошибка автовоспроизведения:', error);
                videoBackground.style.display = 'none';
                document.querySelector('.video-fallback').style.opacity = '1';
            });
        }
    }

    // Обновляем функцию updateStyleLabels с поддержкой всех языков
    function updateStyleLabels() {
        const styleSelect = elements.style;
        const sourceLang = elements.sourceLang.value;
        
        const styles = {
            'ru': {
                'formal': '👔 Формальный',
                'informal': '😊 Неформальный',
                'business': '💼 Деловой',
                'flirt': '💝 Флирт'
            },
            'en-GB': {
                'formal': '👔 Formal',
                'informal': '😊 Informal',
                'business': '💼 Business',
                'flirt': '💝 Flirty'
            },
            'en-US': {
                'formal': '👔 Formal',
                'informal': '😊 Casual',
                'business': '💼 Business',
                'flirt': '💝 Flirty'
            },
            'zh-CN': {
                'formal': '👔 正式的',
                'informal': '😊 非正式的',
                'business': '💼 商务的',
                'flirt': '💝 调情的'
            },
            'zh-TW': {
                'formal': '👔 正式的',
                'informal': '😊 非正式的',
                'business': '💼 商務的',
                'flirt': '💝 調情的'
            },
            'ja': {
                'formal': '👔 フォーマル',
                'informal': '😊 カジュアル',
                'business': '💼 ビジネス',
                'flirt': '💝 フラート'
            },
            'ko': {
                'formal': '👔 격식있는',
                'informal': '😊 비격식',
                'business': '💼 비즈니스',
                'flirt': '💝 플러트'
            },
            'ar': {
                'formal': '👔 رسمي',
                'informal': '😊 غير رسمي',
                'business': '💼 عمل',
                'flirt': '💝 مغازلة'
            },
            'hi': {
                'formal': '👔 औपचारिक',
                'informal': '😊 अनौपचारिक',
                'business': '💼 व्यावसायिक',
                'flirt': '💝 फ़्लर्ट'
            },
            'de': {
                'formal': '👔 Formal',
                'informal': '😊 Informal',
                'business': '💼 Business',
                'flirt': '💝 Flirt'
            },
            'es': {
                'formal': '👔 Formal',
                'informal': '😊 Informal',
                'business': '💼 Business',
                'flirt': '💝 Flirty'
            },
            'fr': {
                'formal': '👔 Formal',
                'informal': '😊 Casual',
                'business': '💼 Business',
                'flirt': '💝 Flirty'
            },
            'it': {
                'formal': '👔 Formal',
                'informal': '😊 Casual',
                'business': '💼 Business',
                'flirt': '💝 Flirty'
            },
            'pt': {
                'formal': '👔 Formal',
                'informal': '😊 Casual',
                'business': '💼 Business',
                'flirt': '💝 Flirty'
            },
            'be': {
                'formal': '👔 Formal',
                'informal': '😊 Informal',
                'business': '💼 Business',
                'flirt': '💝 Flirt'
            },
            'uk': {
                'formal': '👔 Формальный',
                'informal': '😊 Неформальный',
                'business': '💼 Деловой',
                'flirt': '💝 Флирт'
            },
            'kk': {
                'formal': '👔 Формальный',
                'informal': '😊 Неформальный',
                'business': '💼 Деловой',
                'flirt': '💝 Флирт'
            },
            'bn': {
                'formal': '👔 Формальный',
                'informal': '😊 Неформальный',
                'business': '💼 Деловой',
                'flirt': '💝 Флирт'
            },
            'default': {
                'formal': '👔 Formal',
                'informal': '😊 Informal',
                'business': '💼 Business',
                'flirt': '💝 Flirt'
            }
        };

        // Добавляем европейские языки с одинаковыми стилями
        const europeanLanguages = ['de', 'es', 'fr', 'it', 'pt'];
        europeanLanguages.forEach(lang => {
            styles[lang] = styles['default'];
        });

        // Добавляем славянские языки с русскими стилями
        const slavicLanguages = ['be', 'uk', 'kk'];
        slavicLanguages.forEach(lang => {
            styles[lang] = styles['ru'];
        });

        const currentStyle = styleSelect.value;
        const selectedLang = sourceLang === 'auto' ? 'default' : sourceLang;
        const styleLabels = styles[selectedLang] || styles['default'];

        Array.from(styleSelect.options).forEach(option => {
            const styleKey = option.value;
            if (styleLabels[styleKey]) {
                option.text = styleLabels[styleKey];
            }
        });

        styleSelect.value = currentStyle;
    }

    // Новая функция для определения языка
    function detectAndUpdateLanguage(text, apiDetectedLang) {
        const languagePatterns = {
            // Азиатские языки
            'zh-TW': {
                pattern: /[體與這來時後見將還會發現經樂東方]/,
                required: true,
                score: text => (text.match(/[體與這來時後見將還會發現經樂東方]/g) || []).length
            },
            'zh-CN': {
                pattern: /[简体车站语言支持]/,
                required: true,
                score: text => (text.match(/[简体车站语言支持]/g) || []).length
            },
            'ja': {
                pattern: /[\u3040-\u309F\u30A0-\u30FF]/,
                score: text => (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length * 2
            },
            'ko': {
                pattern: /[\uAC00-\uD7AF]/,
                score: text => (text.match(/[\uAC00-\uD7AF]/g) || []).length * 2
            },

            // Славянские языки
            'uk': {
                pattern: /[іїєґІЇЄҐ]/,
                score: text => (text.match(/[іїєґІЇЄҐ]/g) || []).length * 3
            },
            'be': {
                pattern: /[ўЎ]/,
                score: text => (text.match(/[ўЎ]/g) || []).length * 3
            },
            'kk': {
                pattern: /[қғңүұһәіңҚҒҢҮҰҺӘІҢ]/,
                score: text => (text.match(/[қғңүұһәіңҚҒҢҮҰҺӘІҢ]/g) || []).length * 3
            },
            'ru': {
                pattern: /[а-яА-ЯёЁ]/,
                exclude: /[іїєґІЇЄҐўЎқғңүұһәіңҚҒҢҮҰҺӘІҢ]/,
                score: text => (text.match(/[а-яА-ЯёЁ]/g) || []).length
            },

            // Другие языки с уникальными алфавитами
            'ar': {
                pattern: /[\u0600-\u06FF]/,
                score: text => (text.match(/[\u0600-\u06FF]/g) || []).length * 2
            },
            'hi': {
                pattern: /[\u0900-\u097F]/,
                score: text => (text.match(/[\u0900-\u097F]/g) || []).length * 2
            },
            'bn': {
                pattern: /[\u0980-\u09FF]/,
                score: text => (text.match(/[\u0980-\u09FF]/g) || []).length * 2
            },

            // Европейские языки
            'de': {
                pattern: /[äöüß]/,
                words: /\b(der|die|das|und|ist|ich|sie|mit|für|nicht)\b/gi,
                score: text => {
                    const specialChars = (text.match(/[äöüß]/g) || []).length * 2;
                    const words = (text.match(/\b(der|die|das|und|ist|ich|sie|mit|für|nicht)\b/gi) || []).length;
                    return specialChars + words;
                }
            },
            'fr': {
                pattern: /[àâæçéèêëîïôœùûüÿ]/,
                words: /\b(le|la|les|je|nous|vous|ils|être|avoir|dans)\b/gi,
                score: text => {
                    const specialChars = (text.match(/[àâæçéèêëîïôœùûüÿ]/g) || []).length * 2;
                    const words = (text.match(/\b(le|la|les|je|nous|vous|ils|être|avoir|dans)\b/gi) || []).length;
                    return specialChars + words;
                }
            },
            'es': {
                pattern: /[áéíóúñ¿¡]/,
                words: /\b(el|la|los|las|que|con|para|está|sobre|como)\b/gi,
                score: text => {
                    const specialChars = (text.match(/[áéíóúñ¿¡]/g) || []).length * 2;
                    const words = (text.match(/\b(el|la|los|las|que|con|para|está|sobre|como)\b/gi) || []).length;
                    return specialChars + words;
                }
            },
            'it': {
                pattern: /[àèéìíîòóùú]/,
                words: /\b(il|lo|la|gli|che|con|per|sono|questo|come)\b/gi,
                score: text => {
                    const specialChars = (text.match(/[àèéìíîòóùú]/g) || []).length * 2;
                    const words = (text.match(/\b(il|lo|la|gli|che|con|per|sono|questo|come)\b/gi) || []).length;
                    return specialChars + words;
                }
            },
            'pt': {
                pattern: /[áâãàçéêíóôõú]/,
                words: /\b(o|a|os|as|que|com|para|está|isso|como)\b/gi,
                score: text => {
                    const specialChars = (text.match(/[áâãàçéêíóôõú]/g) || []).length * 2;
                    const words = (text.match(/\b(o|a|os|as|que|com|para|está|isso|como)\b/gi) || []).length;
                    return specialChars + words;
                }
            }
        };

        // Определяем язык
        let detectedLang = null;
        let maxScore = 0;

        // Проверяем каждый язык
        for (const [lang, config] of Object.entries(languagePatterns)) {
            // Пропускаем язык, если есть required паттерн и он не соответствует
            if (config.required && !config.pattern.test(text)) continue;
            // Пропускаем язык, если есть exclude паттерн и он соответствует
            if (config.exclude && config.exclude.test(text)) continue;

            const score = config.score(text);
            if (score > maxScore) {
                maxScore = score;
                detectedLang = lang;
            }
        }

        // Если язык не определен и есть латиница, проверяем британский/американский английский
        if (!detectedLang && /[a-zA-Z]/.test(text)) {
            const britishWords = /\b(colour|behaviour|centre|theatre|metre|litre)\b/gi;
            const americanWords = /\b(color|behavior|center|theater|meter|liter)\b/gi;
            
            const britishCount = (text.match(britishWords) || []).length;
            const americanCount = (text.match(americanWords) || []).length;
            
            detectedLang = britishCount > americanCount ? 'en-GB' : 'en-US';
        }

        // Обновляем селектор языка
        if (detectedLang) {
            const sourceLangSelect = document.getElementById('sourceLang');
            const option = sourceLangSelect.querySelector(`option[value="${detectedLang}"]`);
            
            if (option) {
                sourceLangSelect.value = detectedLang;
                sourceLangSelect.style.transition = 'all 0.3s ease';
                sourceLangSelect.style.borderColor = 'var(--neon-blue)';
                sourceLangSelect.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.3)';
                
                setTimeout(() => {
                    sourceLangSelect.style.borderColor = '';
                    sourceLangSelect.style.boxShadow = '';
                }, 1500);

                updateStyleLabels();
            }
        }
    }

    // Удаляем слушатель ввода, так как теперь определяем язык только при переводе
    elements.sourceText.removeEventListener('input', updateSourceLang);

    // Инициализируем метки стилей при загрузке
    updateStyleLabels();
}); 