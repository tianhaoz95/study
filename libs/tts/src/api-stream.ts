// src/api-stream.ts

export class ApiStreamEngine {
  private apiEndpoint: string;
  private audio: HTMLAudioElement | null = null;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  public speak(
    text: string,
    lang: 'en' | 'zh',
    speed: number,
    onEnd: () => void,
    onError: (err: any) => void
  ): boolean {
    try {
      this.cancel(); // Stop any current audio

      // We assume the API endpoint takes POST with JSON payload and returns an audio stream
      // or we can structure the URL as a GET request if the API supports it.
      // A POST request is usually more robust for long text payloads.
      const url = new URL(this.apiEndpoint);
      
      this.audio = new Audio();
      this.audio.playbackRate = speed;

      // We can create a blob URL from the fetch response
      fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, lang, speed })
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`API stream error: ${res.status} ${res.statusText}`);
        }
        return res.blob();
      })
      .then(blob => {
        if (!this.audio) return; // Playback was cancelled
        const blobUrl = URL.createObjectURL(blob);
        
        this.audio.src = blobUrl;
        this.audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          onEnd();
        };
        this.audio.onerror = (e) => {
          URL.revokeObjectURL(blobUrl);
          onError(e);
        };
        
        // Handle play start
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            onError(err);
          });
        }
      })
      .catch(err => {
        onError(err);
      });

      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }

  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  public resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play().catch(() => {});
    }
  }

  public cancel(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
  }
}
