// src/web-speech.ts

export class WebSpeechEngine {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public speak(
    text: string,
    lang: 'en' | 'zh',
    speed: number,
    onEnd: () => void,
    onError: (err: any) => void
  ): boolean {
    if (!this.synth) {
      onError(new Error('SpeechSynthesis not supported in this environment.'));
      return false;
    }

    try {
      console.log(`WebSpeechEngine: speak called for lang=${lang}, speed=${speed}, text length=${text.length}`);
      
      // Only cancel if speaking
      if (this.synth.speaking) {
        console.log('WebSpeechEngine: synth is speaking, calling cancel');
        this.synth.cancel();
      }
      
      // Ensure it is not paused
      if (this.synth.paused) {
        console.log('WebSpeechEngine: synth is paused, calling resume');
        this.synth.resume();
      }

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.rate = speed;

      const voices = this.synth.getVoices();
      const currentLang = lang.toLowerCase();
      console.log(`WebSpeechEngine: total voices available: ${voices.length}`);

      // Prioritize online/remote natural voices, then premium local voices
      let matchedVoice = voices.find(v =>
        v.lang.toLowerCase().startsWith(currentLang) &&
        (v.name.includes('Online') || v.name.includes('Natural') || v.localService === false)
      );

      if (!matchedVoice) {
        matchedVoice = voices.find(v =>
          v.lang.toLowerCase().startsWith(currentLang) &&
          (v.name.includes('Siri') || v.name.includes('Premium') || v.name.includes('Google'))
        );
      }

      if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(currentLang));
      }

      if (matchedVoice) {
        console.log(`WebSpeechEngine: matched voice: ${matchedVoice.name} (${matchedVoice.lang})`);
        this.currentUtterance.voice = matchedVoice;
      } else {
        console.log('WebSpeechEngine: no matching voice found, using browser default');
      }

      this.currentUtterance.onstart = () => {
        console.log('WebSpeechEngine: utterance started');
      };

      this.currentUtterance.onend = () => {
        console.log('WebSpeechEngine: utterance ended normally');
        this.currentUtterance = null;
        onEnd();
      };

      this.currentUtterance.onerror = (e) => {
        console.warn('WebSpeechEngine: utterance error:', e.error, e);
        if (e.error !== 'interrupted') {
          this.currentUtterance = null;
          onError(e);
        }
      };

      this.synth.speak(this.currentUtterance);
      return true;
    } catch (err) {
      console.error('WebSpeechEngine: speak threw exception:', err);
      onError(err);
      return false;
    }
  }

  public pause(): void {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      console.log('WebSpeechEngine: pausing speech');
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth && this.synth.paused) {
      console.log('WebSpeechEngine: resuming speech');
      this.synth.resume();
    }
  }

  public cancel(): void {
    if (this.synth) {
      if (this.synth.speaking) {
        console.log('WebSpeechEngine: active speech detected, calling cancel');
        this.synth.cancel();
      }
      if (this.synth.paused) {
        console.log('WebSpeechEngine: synth was paused, resuming to clear state');
        this.synth.resume();
      }
    }
    this.currentUtterance = null;
  }
}
