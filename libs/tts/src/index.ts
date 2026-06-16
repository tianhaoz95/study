// src/index.ts

import { ApiStreamEngine } from './api-stream';
import { WasmOnnxEngine } from './wasm-onnx';
import { WebSpeechEngine } from './web-speech';

export interface CascadeTtsOptions {
  apiEndpoint?: string;
  onnxModelUrl?: string;
  speed?: number;
  lang?: 'en' | 'zh';
}

export type TtsEngineType = 'api' | 'wasm' | 'web-speech' | null;

export class CascadeTtsPlayer {
  private apiEngine: ApiStreamEngine | null = null;
  private wasmEngine: WasmOnnxEngine | null = null;
  private webSpeechEngine: WebSpeechEngine;

  private speed = 1.0;
  private lang: 'en' | 'zh' = 'en';
  private activeEngine: TtsEngineType = null;
  private currentText = '';

  constructor(options: CascadeTtsOptions = {}) {
    if (options.apiEndpoint) {
      this.apiEngine = new ApiStreamEngine(options.apiEndpoint);
    }
    if (options.onnxModelUrl) {
      this.wasmEngine = new WasmOnnxEngine(options.onnxModelUrl);
    }
    this.webSpeechEngine = new WebSpeechEngine();

    if (options.speed) this.speed = options.speed;
    if (options.lang) this.lang = options.lang;
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public setLang(lang: 'en' | 'zh'): void {
    this.lang = lang;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.webSpeechEngine.getVoices();
  }

  public play(
    text: string,
    onStart: () => void,
    onEnd: () => void,
    onError: (err: any) => void
  ): void {
    this.cancel(); // Reset any playing content
    this.currentText = text;
    onStart();

    // Start Cascade attempts
    this.tryApi(text, onEnd, onError);
  }

  private tryApi(text: string, onEnd: () => void, onError: (err: any) => void): void {
    if (this.apiEngine) {
      const success = this.apiEngine.speak(
        text,
        this.lang,
        this.speed,
        () => {
          this.activeEngine = null;
          onEnd();
        },
        (err) => {
          console.warn('TTS API Engine failed, cascading to WASM:', err);
          this.activeEngine = null;
          this.tryWasm(text, onEnd, onError);
        }
      );

      if (success) {
        this.activeEngine = 'api';
        return;
      }
    }
    
    // If API engine wasn't configured or failed synchronously
    this.tryWasm(text, onEnd, onError);
  }

  private tryWasm(text: string, onEnd: () => void, onError: (err: any) => void): void {
    if (this.wasmEngine) {
      const success = this.wasmEngine.speak(
        text,
        this.lang,
        this.speed,
        () => {
          this.activeEngine = null;
          onEnd();
        },
        (err) => {
          console.warn('TTS WASM Engine failed, cascading to Web Speech API:', err);
          this.activeEngine = null;
          this.tryWebSpeech(text, onEnd, onError);
        }
      );

      if (success) {
        this.activeEngine = 'wasm';
        return;
      }
    }

    // If WASM engine wasn't configured or failed synchronously
    this.tryWebSpeech(text, onEnd, onError);
  }

  private tryWebSpeech(text: string, onEnd: () => void, onError: (err: any) => void): void {
    this.activeEngine = 'web-speech';
    const success = this.webSpeechEngine.speak(
      text,
      this.lang,
      this.speed,
      () => {
        this.activeEngine = null;
        onEnd();
      },
      (err) => {
        this.activeEngine = null;
        onError(err);
      }
    );

    if (!success) {
      this.activeEngine = null;
    }
  }

  public pause(): void {
    if (this.activeEngine === 'api' && this.apiEngine) {
      this.apiEngine.pause();
    } else if (this.activeEngine === 'wasm' && this.wasmEngine) {
      this.wasmEngine.pause();
    } else if (this.activeEngine === 'web-speech') {
      this.webSpeechEngine.pause();
    }
  }

  public resume(): void {
    if (this.activeEngine === 'api' && this.apiEngine) {
      this.apiEngine.resume();
    } else if (this.activeEngine === 'wasm' && this.wasmEngine) {
      this.wasmEngine.resume();
    } else if (this.activeEngine === 'web-speech') {
      this.webSpeechEngine.resume();
    }
  }

  public cancel(): void {
    if (this.apiEngine) this.apiEngine.cancel();
    if (this.wasmEngine) this.wasmEngine.cancel();
    this.webSpeechEngine.cancel();
    this.activeEngine = null;
  }

  public getActiveEngine(): TtsEngineType {
    return this.activeEngine;
  }
}
export { WebSpeechEngine } from './web-speech';
export { ApiStreamEngine } from './api-stream';
export { WasmOnnxEngine } from './wasm-onnx';
