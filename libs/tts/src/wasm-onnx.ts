// src/wasm-onnx.ts

export class WasmOnnxEngine {
  private modelUrl: string | null = null;
  private ortSession: any = null;
  private isInitializing = false;

  constructor(modelUrl?: string) {
    if (modelUrl) this.modelUrl = modelUrl;
  }

  private async loadOrtScript(): Promise<any> {
    if ((window as any).ort) return (window as any).ort;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js';
      script.onload = () => {
        resolve((window as any).ort);
      };
      script.onerror = (err) => {
        reject(new Error('Failed to load ONNX Runtime script from CDN: ' + err));
      };
      document.head.appendChild(script);
    });
  }

  public async init(timeoutMs = 3000): Promise<boolean> {
    if (!this.modelUrl) return false;
    if (this.ortSession) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;

    // Set up a timeout to avoid hanging the player
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('WASM initialization timed out')), timeoutMs);
    });

    try {
      const initPromise = (async () => {
        const ort = await this.loadOrtScript();
        
        // Try creating an ONNX session with the model URL
        // In the future, we can configure specific execution providers like webgpu or wasm
        this.ortSession = await ort.InferenceSession.create(this.modelUrl!, {
          executionProviders: ['wasm']
        });
        return true;
      })();

      await Promise.race([initPromise, timeoutPromise]);
      this.isInitializing = false;
      return true;
    } catch (err) {
      console.warn('WASM ONNX initialization failed, falling back:', err);
      this.isInitializing = false;
      return false;
    }
  }

  public speak(
    text: string,
    lang: 'en' | 'zh',
    speed: number,
    onEnd: () => void,
    onError: (err: any) => void
  ): boolean {
    // If the session isn't loaded yet, try initializing it.
    // Since it's async, we return false immediately to let the cascade engine fallback to SpeechSynthesis,
    // ensuring the user gets instant audio without waiting.
    if (!this.ortSession) {
      this.init().catch(() => {});
      return false;
    }

    try {
      // NOTE: Client-side neural TTS requires text phonemization/tokenization
      // which is model-specific and typically requires a 5MB+ javascript tokenizer bundle.
      // This is a template showing how to run inference once tokenized.
      // If a full custom local synthesizer pipeline is needed, implement tokenization here.
      
      // For this general cascade player, if the full tokenizer pipeline is not configured,
      // we return false to let the cascade flow to Web Speech API.
      return false;
    } catch (err) {
      onError(err);
      return false;
    }
  }

  public pause(): void {
    // Implement pause logic for WASM audio buffer playback
  }

  public resume(): void {
    // Implement resume logic for WASM audio buffer playback
  }

  public cancel(): void {
    // Stop WASM audio buffer playback
  }
}
