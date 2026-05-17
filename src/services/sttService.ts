export interface STTConfig {
  language: string
  continuous: boolean
  autoSend: boolean
  autoSendDelay: number
}

const DEFAULT_STT_CONFIG: STTConfig = {
  language: 'zh-CN',
  continuous: false,
  autoSend: false,
  autoSendDelay: 2000,
}

export function getSTTConfig(): STTConfig {
  const saved = localStorage.getItem('stt-config')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_STT_CONFIG, ...parsed, language: parsed.language || DEFAULT_STT_CONFIG.language }
    } catch {}
  }
  return DEFAULT_STT_CONFIG
}

export function saveSTTConfig(config: STTConfig) {
  localStorage.setItem('stt-config', JSON.stringify(config))
}

export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'zh-TW', label: '中文（繁体）' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'es-ES', label: 'Español' },
  { code: 'ru-RU', label: 'Русский' },
]

let recognition: SpeechRecognition | null = null;
let isListening: boolean = false;
let autoSendTimer: ReturnType<typeof setTimeout> | null = null;

export function startListening(
  onResult: (text: string) => void,
  onInterim: (text: string) => void,
  onError: (err: string) => void,
  onEnd: () => void
) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('你的浏览器不支持语音识别，请使用 Chrome');
    return;
  }

  stopListening();

  const config = getSTTConfig();

  recognition = new SpeechRecognition();
  recognition.lang = config.language;
  recognition.interimResults = true;
  recognition.continuous = config.continuous;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (interimTranscript) {
      onInterim(interimTranscript);
    }
    if (finalTranscript) {
      onResult(finalTranscript);

      if (autoSendTimer) {
        clearTimeout(autoSendTimer);
        autoSendTimer = null;
      }
    }
  };

  recognition.onerror = (event: any) => {
    onError(`语音识别错误: ${event.error}`);
    isListening = false;
  };

  recognition.onend = () => {
    isListening = false;
    onEnd();
  };

  recognition.start();
  isListening = true;
}

export function stopListening() {
  if (recognition) {
    try { recognition.stop(); } catch {}
    recognition = null;
  }
  isListening = false;
  if (autoSendTimer) {
    clearTimeout(autoSendTimer);
    autoSendTimer = null;
  }
}

export function getIsListening() {
  return isListening;
}
