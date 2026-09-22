/**
 * ReadEase Bilingual Text-To-Speech (TTS) Engine
 *
 * Supports:
 * - Malayalam (Native ml-IN speech via AI Service gTTS + Web Speech API fallback)
 * - English (US, UK, Indian, etc. via Web Speech API)
 * - Voice Gender: Female & Male voice selection
 * - Voice Personas: Friendly Tutor, Expressive Storyteller, Calm Guide, Focused Academic
 * - Pitch & Speed adjustments
 * - Real-time word boundary callbacks for synchronized karaoke highlighting
 */

import type { VoiceGender, VoicePersona } from '@readease/shared';

export interface TTSVoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: VoiceGender;
  isMalayalam: boolean;
  isOnline?: boolean;
}

export interface SpeakOptions {
  text: string;
  language?: 'en' | 'ml' | 'auto';
  voiceGender?: VoiceGender;
  voicePersona?: VoicePersona;
  voiceName?: string;
  rate?: number;
  pitch?: number;
  onWordBoundary?: (wordIndex: number, word: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

interface TTSWordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
}

export class TTSEngine {
  private static activeAudio: HTMLAudioElement | null = null;
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static audioInterval: number | null = null;

  /**
   * Persona speech adjustments (multipliers on base rate and pitch)
   */
  public static readonly PERSONA_CONFIG: Record<
    VoicePersona,
    {
      label: string;
      iconName: string;
      desc: string;
      rateMultiplier: number;
      pitchMultiplier: number;
    }
  > = {
    tutor: {
      label: 'Friendly Tutor',
      iconName: 'GraduationCap',
      desc: 'Supportive, patient, and warm teaching cadence',
      rateMultiplier: 0.95,
      pitchMultiplier: 1.05
    },
    storyteller: {
      label: 'Expressive Storyteller',
      iconName: 'BookOpen',
      desc: 'Melodious, vivid, and engaging storytelling tone',
      rateMultiplier: 1.0,
      pitchMultiplier: 1.15
    },
    calm: {
      label: 'Calm Guide',
      iconName: 'Smile',
      desc: 'Relaxed, soothing, low-sensory cadence for visual ease',
      rateMultiplier: 0.85,
      pitchMultiplier: 0.88
    },
    academic: {
      label: 'Focused Academic',
      iconName: 'Sparkles',
      desc: 'Crisp, articulate, focused precision reading',
      rateMultiplier: 1.05,
      pitchMultiplier: 1.0
    }
  };

  /**
   * Retrieves all available voices from the browser and classifies them by language & gender.
   */
  public static getAvailableVoices(): Promise<TTSVoiceOption[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve([]);
        return;
      }

      const fetchVoices = () => {
        const rawVoices = window.speechSynthesis.getVoices();
        const list: TTSVoiceOption[] = rawVoices.map((v) => {
          const nameLower = v.name.toLowerCase();
          const langLower = v.lang.toLowerCase();

          // Determine gender from voice name keywords
          let gender: VoiceGender = 'neutral';
          if (
            nameLower.includes('female') ||
            nameLower.includes('zira') ||
            nameLower.includes('jenny') ||
            nameLower.includes('aria') ||
            nameLower.includes('heera') ||
            nameLower.includes('samantha') ||
            nameLower.includes('karen') ||
            nameLower.includes('victoria') ||
            nameLower.includes('priya') ||
            nameLower.includes('ananya') ||
            nameLower.includes('aditi') ||
            nameLower.includes('swara')
          ) {
            gender = 'female';
          } else if (
            nameLower.includes('male') ||
            nameLower.includes('david') ||
            nameLower.includes('mark') ||
            nameLower.includes('george') ||
            nameLower.includes('guy') ||
            nameLower.includes('ryan') ||
            nameLower.includes('ravi') ||
            nameLower.includes('madhav') ||
            nameLower.includes('valluvar') ||
            nameLower.includes('mohan')
          ) {
            gender = 'male';
          }

          const isMalayalam = langLower.startsWith('ml') || nameLower.includes('malayalam');

          return {
            id: v.name,
            name: v.name,
            lang: v.lang,
            gender,
            isMalayalam
          };
        });

        resolve(list);
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        fetchVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          fetchVoices();
        };
        // Timeout fallback if onvoiceschanged doesn't fire
        setTimeout(fetchVoices, 250);
      }
    });
  }

  /**
   * Stops any currently playing speech (both Web Speech and HTML5 Audio).
   */
  public static stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }

    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }

    if (this.audioInterval) {
      window.clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
  }

  /**
   * Pauses active speech.
   */
  public static pause(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resumes paused speech.
   */
  public static resume(): void {
    if (this.activeAudio) {
      this.activeAudio.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * Checks if speech is actively playing.
   */
  public static isSpeaking(): boolean {
    if (this.activeAudio) {
      return !this.activeAudio.paused && !this.activeAudio.ended;
    }
    if (this.activeUtterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.speaking && !window.speechSynthesis.paused;
    }
    return false;
  }

  /**
   * Checks if speech is currently paused.
   */
  public static isPaused(): boolean {
    if (this.activeAudio) {
      return this.activeAudio.paused && this.activeAudio.currentTime > 0 && !this.activeAudio.ended;
    }
    if (this.activeUtterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.paused;
    }
    return false;
  }

  /**
   * Synthesizes and speaks text using either Web Speech API or Backend AI Service (for Malayalam).
   */
  public static async speak(options: SpeakOptions): Promise<void> {
    this.stop();

    const text = options.text.trim();
    if (!text) return;

    // Detect Malayalam Unicode block: 0D00 - 0D7F
    const containsMalayalam = /[\u0D00-\u0D7F]/.test(text);
    const targetLang =
      options.language === 'ml' || (options.language === 'auto' && containsMalayalam)
        ? 'ml'
        : options.language === 'en'
          ? 'en'
          : containsMalayalam
            ? 'ml'
            : 'en';

    const baseRate = options.rate || 1.0;
    const basePitch = options.pitch || 1.0;
    const persona = options.voicePersona || 'tutor';
    const personaConfig = this.PERSONA_CONFIG[persona] || this.PERSONA_CONFIG.tutor;

    // Calculate effective pitch and rate
    let effectiveRate = Math.max(0.5, Math.min(2.0, baseRate * personaConfig.rateMultiplier));
    let effectivePitch = Math.max(0.5, Math.min(2.0, basePitch * personaConfig.pitchMultiplier));

    // Male voice gender shift: slightly lower pitch if neutral/generic voice used
    if (options.voiceGender === 'male') {
      effectivePitch = Math.max(0.6, effectivePitch * 0.85);
    } else if (options.voiceGender === 'female') {
      effectivePitch = Math.min(1.8, effectivePitch * 1.08);
    }

    const availableVoices = await this.getAvailableVoices();

    // Check if there is an offline/local Malayalam voice installed in the browser
    const localMalayalamVoice = availableVoices.find(
      (v) => v.isMalayalam || v.lang.toLowerCase().startsWith('ml')
    );

    // If Malayalam text AND no browser Malayalam voice is present -> use AI Service gTTS
    if (targetLang === 'ml' && !localMalayalamVoice) {
      try {
        await this.speakViaBackendAudio({
          text,
          language: 'ml',
          rate: effectiveRate,
          pitch: effectivePitch,
          voiceGender: options.voiceGender || 'female',
          onStart: options.onStart,
          onWordBoundary: options.onWordBoundary,
          onEnd: options.onEnd,
          onError: options.onError
        });
        return;
      } catch (backendErr) {
        console.warn('Backend Malayalam TTS failed, falling back to Web Speech API', backendErr);
      }
    }

    // Standard Web Speech API synthesis
    this.speakViaWebSpeech({
      text,
      lang: targetLang === 'ml' ? 'ml-IN' : 'en-US',
      rate: effectiveRate,
      pitch: effectivePitch,
      gender: options.voiceGender,
      voiceName: options.voiceName,
      availableVoices,
      onStart: options.onStart,
      onWordBoundary: options.onWordBoundary,
      onEnd: options.onEnd,
      onError: options.onError
    });
  }

  /**
   * Web Speech API Utterance Handler
   */
  private static speakViaWebSpeech(params: {
    text: string;
    lang: string;
    rate: number;
    pitch: number;
    gender?: VoiceGender;
    voiceName?: string;
    availableVoices: TTSVoiceOption[];
    onStart?: () => void;
    onWordBoundary?: (wordIndex: number, word: string) => void;
    onEnd?: () => void;
    onError?: (err: Error) => void;
  }): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      params.onError?.(new Error('Speech synthesis is not supported on this browser.'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(params.text);
    utterance.lang = params.lang;
    utterance.rate = params.rate;
    utterance.pitch = params.pitch;

    const rawVoices = window.speechSynthesis.getVoices();

    // Match voice by explicit name if chosen
    let selectedVoice: SpeechSynthesisVoice | undefined;
    if (params.voiceName && params.voiceName !== 'default') {
      selectedVoice = rawVoices.find((v) => v.name === params.voiceName);
    }

    // Match voice by language + gender if explicit voice not found
    if (!selectedVoice) {
      const isLangMl = params.lang.startsWith('ml');
      const langVoices = rawVoices.filter((v) =>
        isLangMl
          ? v.lang.toLowerCase().startsWith('ml') || v.name.toLowerCase().includes('malayalam')
          : v.lang.toLowerCase().startsWith('en')
      );

      if (params.gender) {
        selectedVoice = langVoices.find((v) => {
          const vLower = v.name.toLowerCase();
          if (params.gender === 'female') {
            return (
              vLower.includes('female') ||
              vLower.includes('zira') ||
              vLower.includes('jenny') ||
              vLower.includes('aria') ||
              vLower.includes('heera') ||
              vLower.includes('samantha')
            );
          } else if (params.gender === 'male') {
            return (
              vLower.includes('male') ||
              vLower.includes('david') ||
              vLower.includes('mark') ||
              vLower.includes('george') ||
              vLower.includes('guy') ||
              vLower.includes('ryan')
            );
          }
          return false;
        });
      }

      if (!selectedVoice && langVoices.length > 0) {
        selectedVoice = langVoices[0];
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      params.onStart?.();
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word' && params.onWordBoundary) {
        const charIdx = event.charIndex;
        const textBefore = params.text.slice(0, charIdx);
        const wordIndex = textBefore.split(/\s+/).filter(Boolean).length;
        const words = params.text.split(/\s+/).filter(Boolean);
        const currentWord = words[wordIndex] || '';
        params.onWordBoundary(wordIndex, currentWord);
      }
    };

    utterance.onend = () => {
      this.activeUtterance = null;
      params.onEnd?.();
    };

    utterance.onerror = (e) => {
      this.activeUtterance = null;
      params.onError?.(new Error(`Speech synthesis error: ${e.error}`));
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Backend AI Service Audio Synthesis (High-accuracy native Malayalam TTS)
   */
  private static async speakViaBackendAudio(params: {
    text: string;
    language: 'ml' | 'en';
    rate: number;
    pitch: number;
    voiceGender: VoiceGender;
    onStart?: () => void;
    onWordBoundary?: (wordIndex: number, word: string) => void;
    onEnd?: () => void;
    onError?: (err: Error) => void;
  }): Promise<void> {
    const response = await fetch('/api/v1/tts/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: params.text,
        language: params.language,
        voice: params.voiceGender,
        rate: params.rate,
        pitch: params.pitch
      })
    });

    if (!response.ok) {
      throw new Error(`TTS API failed with status ${response.status}`);
    }

    const data: {
      audio_base64: string;
      audio_format: string;
      duration_ms: number;
      word_timings: TTSWordTiming[];
    } = await response.json();

    if (!data.audio_base64) {
      throw new Error('TTS API returned empty audio stream');
    }

    const audioUrl = `data:audio/${data.audio_format || 'mp3'};base64,${data.audio_base64}`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = params.rate;

    this.activeAudio = audio;

    // Track word timings for karaoke highlighting
    if (data.word_timings && data.word_timings.length > 0 && params.onWordBoundary) {
      const timings = data.word_timings;
      this.audioInterval = window.setInterval(() => {
        if (!audio || audio.paused) return;
        const currentMs = audio.currentTime * 1000;
        const currentTimingIdx = timings.findIndex(
          (t) => currentMs >= t.start_ms && currentMs <= t.end_ms
        );
        if (currentTimingIdx !== -1) {
          params.onWordBoundary?.(currentTimingIdx, timings[currentTimingIdx].word);
        }
      }, 50);
    }

    audio.onplay = () => {
      params.onStart?.();
    };

    audio.onended = () => {
      if (this.audioInterval) {
        window.clearInterval(this.audioInterval);
        this.audioInterval = null;
      }
      this.activeAudio = null;
      params.onEnd?.();
    };

    audio.onerror = () => {
      if (this.audioInterval) {
        window.clearInterval(this.audioInterval);
        this.audioInterval = null;
      }
      this.activeAudio = null;
      params.onError?.(new Error('Audio playback failed'));
    };

    await audio.play();
  }
}
