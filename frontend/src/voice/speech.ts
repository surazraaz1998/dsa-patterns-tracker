// Thin wrappers over the browser Web Speech API: speech-to-text (SpeechRecognition,
// Chrome/Edge/Safari) and text-to-speech (speechSynthesis, all modern browsers).

type RecognitionResultEvent = {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    onresult: ((e: RecognitionResultEvent) => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const speechSupport = {
    recognition: () => recognitionCtor() !== null,
    synthesis: () => typeof window !== 'undefined' && 'speechSynthesis' in window,
};

export type ListenHandlers = {
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (message: string) => void;
    onEnd: () => void;
};

/** Listens for one utterance. Returns a stop function. */
export function listenOnce(lang: string, handlers: ListenHandlers): () => void {
    const Ctor = recognitionCtor();
    if (!Ctor) {
        handlers.onError('Voice input is not supported in this browser. Type your answer instead (Chrome works best).');
        handlers.onEnd();
        return () => {};
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = '';
    rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const result = e.results[i];
            if (result.isFinal) finalText += result[0].transcript;
            else interim += result[0].transcript;
        }
        handlers.onInterim((finalText + ' ' + interim).trim());
    };
    rec.onerror = (e) => {
        const messages: Record<string, string> = {
            'not-allowed': 'Microphone permission denied. Allow mic access in the browser address bar.',
            'no-speech': '',
            'aborted': '',
            'network': 'Speech recognition needs an internet connection.',
        };
        const msg = e.error in messages ? messages[e.error] : `Voice input error: ${e.error}`;
        if (msg) handlers.onError(msg);
    };
    rec.onend = () => {
        if (finalText.trim()) handlers.onFinal(finalText.trim());
        handlers.onEnd();
    };
    rec.start();
    return () => rec.stop();
}

/** Strip markdown/code so the synthesiser doesn't read symbols aloud. */
export function toSpeakable(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' (code screen pe dekh lo) ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_#>|]/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

export function pickVoice(language: 'hinglish' | 'english', preferredName?: string): SpeechSynthesisVoice | null {
    if (!speechSupport.synthesis()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (preferredName) {
        const chosen = voices.find((v) => v.name === preferredName);
        if (chosen) return chosen;
    }
    // Roman-script Hinglish sounds most natural with an Indian-English voice.
    const order = language === 'hinglish' ? ['en-IN', 'hi-IN', 'en-GB', 'en-US'] : ['en-IN', 'en-GB', 'en-US'];
    for (const lang of order) {
        const matches = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
        const female = matches.find((v) => /female|veena|lekha|heera|kalpana|neerja|swara|google/i.test(v.name));
        if (female || matches[0]) return female || matches[0];
    }
    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
}

/**
 * Speaks text incrementally: feed streamed chunks with `push`, call `flush`
 * at the end. Sentences are queued as soon as they're complete so EDITH
 * starts talking before the whole reply has arrived.
 */
export class SpeechQueue {
    private buffer = '';
    private pending = 0;
    private idleWaiters: Array<() => void> = [];
    muted = false;
    voice: SpeechSynthesisVoice | null = null;
    rate = 1.02;

    push(chunk: string) {
        this.buffer += chunk;
        const match = this.buffer.match(/^([\s\S]*[.!?।…\n])(?=\s|$)/);
        if (match) {
            this.buffer = this.buffer.slice(match[1].length);
            this.speak(match[1]);
        }
    }

    flush() {
        if (this.buffer.trim()) this.speak(this.buffer);
        this.buffer = '';
        if (this.pending === 0) this.notifyIdle();
    }

    cancel() {
        this.buffer = '';
        this.pending = 0;
        if (speechSupport.synthesis()) window.speechSynthesis.cancel();
        this.notifyIdle();
    }

    get speaking() {
        return this.pending > 0;
    }

    /** Resolves once everything queued so far has been spoken. */
    whenIdle(): Promise<void> {
        if (this.pending === 0) return Promise.resolve();
        return new Promise((resolve) => this.idleWaiters.push(resolve));
    }

    private speak(text: string) {
        const clean = toSpeakable(text);
        if (!clean || this.muted || !speechSupport.synthesis()) return;
        const u = new SpeechSynthesisUtterance(clean);
        if (this.voice) {
            u.voice = this.voice;
            u.lang = this.voice.lang;
        } else {
            u.lang = 'en-IN';
        }
        u.rate = this.rate;
        this.pending++;
        const done = () => {
            this.pending = Math.max(0, this.pending - 1);
            if (this.pending === 0) this.notifyIdle();
        };
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
    }

    private notifyIdle() {
        const waiters = this.idleWaiters;
        this.idleWaiters = [];
        waiters.forEach((w) => w());
    }
}
