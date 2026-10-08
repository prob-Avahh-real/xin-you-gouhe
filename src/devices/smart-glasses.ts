/**
 * 智能眼镜：窄 FOV 检测 + 头部追踪 + 语音控制
 * 头部：DeviceOrientationEvent 绝对朝向驱动地球环视
 * 语音：Web Speech Recognition API
 */

import type { ContinentId } from '@/config/regions';

export interface SmartGlassesCallbacks {
  onHeadLook?: (alpha: number, beta: number, gamma: number) => void;
  onVoiceCommand?: (command: GlassesVoiceCommand) => void;
  onModeChange?: (active: boolean) => void;
}

export type GlassesVoiceCommand =
  | { type: 'edition'; edition: 'domestic' | 'international' }
  | { type: 'continent'; id: ContinentId }
  | { type: 'world' }
  | { type: 'zoom'; direction: 'in' | 'out' }
  | { type: 'reset' }
  | { type: 'cycle'; direction: 1 | -1 }
  | { type: 'settings' }
  | { type: 'calibrate' };

const HEAD_THROTTLE_MS = 1000 / 30;

/** 智能眼镜窄 FOV：宽 ≤420 且高 ≤340，或宽 ≤340 且高 ≤420 */
export function isGlassesMode(): boolean {
  const w = Math.min(window.innerWidth, screen.width || 9999);
  const h = Math.min(window.innerHeight, screen.height || 9999);
  return (w <= 420 && h <= 340) || (w <= 340 && h <= 420);
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const CONTINENT_VOICE: Array<{ id: ContinentId; patterns: RegExp }> = [
  { id: 'asia', patterns: /亚洲|asia|asian/ },
  { id: 'europe', patterns: /欧洲|europe|european/ },
  { id: 'africa', patterns: /非洲|africa|african/ },
  { id: 'north-america', patterns: /北美|north america|北美洲/ },
  { id: 'south-america', patterns: /南美|south america|南美洲/ },
  { id: 'oceania', patterns: /大洋洲|oceania|澳洲|australia/ },
  { id: 'antarctica', patterns: /南极|antarctica|antarctic/ },
];

function parseVoiceCommand(text: string): GlassesVoiceCommand | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  if (/国内|中国|domestic|china/.test(t)) return { type: 'edition', edition: 'domestic' };
  if (/国外|国际|international|abroad/.test(t)) return { type: 'edition', edition: 'international' };
  if (/全球|世界|global|world/.test(t)) return { type: 'world' };
  if (/放大|zoom in|靠近|近/.test(t)) return { type: 'zoom', direction: 'in' };
  if (/缩小|zoom out|远离|远/.test(t)) return { type: 'zoom', direction: 'out' };
  if (/复位|重置|回正|home|reset/.test(t)) return { type: 'reset' };
  if (/下一个|next|下一/.test(t)) return { type: 'cycle', direction: 1 };
  if (/上一个|prev|previous|上一/.test(t)) return { type: 'cycle', direction: -1 };
  if (/设置|settings|选项/.test(t)) return { type: 'settings' };
  if (/校准|居中|calibrate|center/.test(t)) return { type: 'calibrate' };

  for (const c of CONTINENT_VOICE) {
    if (c.patterns.test(t)) return { type: 'continent', id: c.id };
  }
  return null;
}

export class SmartGlasses {
  private callbacks: SmartGlassesCallbacks;
  private active = false;
  private headEnabled = false;
  private lastHead = 0;
  private recognition: SpeechRecognition | null = null;
  private voiceEnabled = false;
  private voiceDot: HTMLElement | null;
  private statusEl: HTMLElement | null;
  private onResize: () => void;

  constructor(callbacks: SmartGlassesCallbacks, ui?: { voiceDot?: string; statusEl?: string }) {
    this.callbacks = callbacks;
    this.voiceDot = ui?.voiceDot ? document.getElementById(ui.voiceDot) : null;
    this.statusEl = ui?.statusEl ? document.getElementById(ui.statusEl) : null;

    this.onResize = () => this.syncMode();
    window.addEventListener('resize', this.onResize);
    this.syncMode();
  }

  get isActive(): boolean {
    return this.active;
  }

  /** 头部追踪是否接管朝向（此时戒指倾斜应停用） */
  get handlesOrientation(): boolean {
    return this.active && this.headEnabled;
  }

  async enable(): Promise<void> {
    this.syncMode();
    if (this.active) {
      await this.startHeadTracking();
    }
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.stopVoice();
    this.stopHeadTracking();
    document.body.classList.remove('glasses-mode');
    this.setStatus(false);
  }

  /** 重新校准头部追踪中心 */
  recalibrate(): void {
    this.callbacks.onVoiceCommand?.({ type: 'calibrate' });
  }

  private syncMode(): void {
    const next = isGlassesMode();
    if (next === this.active) return;

    this.active = next;
    document.body.classList.toggle('glasses-mode', next);
    this.callbacks.onModeChange?.(next);

    if (next) {
      void this.startHeadTracking();
      this.startVoice();
      this.setStatus(true);
    } else {
      this.stopHeadTracking();
      this.stopVoice();
      this.setStatus(false);
    }
  }

  private setStatus(on: boolean): void {
    this.statusEl?.classList.toggle('active', on);
    if (!on) {
      this.voiceDot?.classList.remove('listening', 'command');
    }
  }

  private async startHeadTracking(): Promise<void> {
    if (this.headEnabled) return;
    const ok = await this.requestOrientation();
    if (!ok) return;
    window.addEventListener('deviceorientation', this.onOrientation);
    this.headEnabled = true;
  }

  private stopHeadTracking(): void {
    if (!this.headEnabled) return;
    window.removeEventListener('deviceorientation', this.onOrientation);
    this.headEnabled = false;
  }

  private async requestOrientation(): Promise<boolean> {
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      try {
        return (await DOE.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  private onOrientation = (e: DeviceOrientationEvent): void => {
    if (!this.active || !this.headEnabled) return;
    const now = performance.now();
    if (now - this.lastHead < HEAD_THROTTLE_MS) return;
    this.lastHead = now;

    const alpha = e.alpha;
    const beta = e.beta;
    const gamma = e.gamma;
    if (alpha == null || beta == null || gamma == null) return;

    this.callbacks.onHeadLook?.(alpha, beta, gamma);
  };

  private startVoice(): void {
    const SR = getSpeechRecognition();
    if (!SR || this.voiceEnabled) return;

    this.stopVoice();
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const last = e.results[e.results.length - 1];
      if (!last?.isFinal) return;
      const text = last[0]?.transcript ?? '';
      const cmd = parseVoiceCommand(text);
      if (!cmd) return;

      this.flashCommand();
      this.callbacks.onVoiceCommand?.(cmd);
    };

    recognition.onerror = () => {
      if (this.voiceEnabled && this.active) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    recognition.onend = () => {
      if (this.voiceEnabled && this.active) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    try {
      recognition.start();
      this.recognition = recognition;
      this.voiceEnabled = true;
      this.voiceDot?.classList.add('listening');
    } catch {
      this.recognition = null;
      this.voiceEnabled = false;
    }
  }

  private stopVoice(): void {
    this.voiceEnabled = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
      this.recognition = null;
    }
    this.voiceDot?.classList.remove('listening', 'command');
  }

  private flashCommand(): void {
    if (!this.voiceDot) return;
    this.voiceDot.classList.add('command');
    window.setTimeout(() => this.voiceDot?.classList.remove('command'), 350);
  }
}

/** 语音命令说明（用于 UI 提示） */
export const GLASSES_VOICE_HINTS = [
  '国内版 / 国外版',
  '亚洲 / 欧洲 / 非洲 …',
  '放大 / 缩小 / 复位',
  '下一个 / 全球 / 校准',
];
