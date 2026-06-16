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
      this.synth.cancel(); // Clear any active speech

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.rate = speed;

      const voices = this.synth.getVoices();
      const currentLang = lang.toLowerCase();

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
        this.currentUtterance.voice = matchedVoice;
      }

      this.currentUtterance.onend = () => {
        this.currentUtterance = null;
        onEnd();
      };

      this.currentUtterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          this.currentUtterance = null;
          onError(e);
        }
      };

      this.synth.speak(this.currentUtterance);
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }

  public pause(): void {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public cancel(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }
}
