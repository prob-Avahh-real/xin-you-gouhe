/**
 * 智能戒指 + 智能手杖输入
 * 戒指：DeviceOrientationEvent 倾斜旋转地球
 * 手杖：DeviceMotionEvent 挥动切换大洲 / 敲击复位
 */

export interface SmartInputCallbacks {
  onTilt?: (gamma: number, beta: number) => void;
  onShake?: () => void;
  onTap?: () => void;
  onSwing?: (direction: 1 | -1) => void;
}

export interface SmartInputOptions {
  /** 为 true 时跳过戒指朝向（由智能眼镜头部追踪接管） */
  skipOrientation?: () => boolean;
}

const TILT_THRESHOLD = 5;
const SHAKE_THRESHOLD = 20;
const ACCEL_TAP_THRESHOLD = 8;
const SWING_THRESHOLD = 3;
const TILT_THROTTLE_MS = 1000 / 8;
const MOTION_THROTTLE_MS = 1000 / 6;

export class SmartInput {
  private callbacks: SmartInputCallbacks;
  private options: SmartInputOptions;
  private lastTilt = 0;
  private lastMotion = 0;
  private lastGamma = 0;
  private lastBeta = 0;
  private enabled = false;

  constructor(callbacks: SmartInputCallbacks, options: SmartInputOptions = {}) {
    this.callbacks = callbacks;
    this.options = options;
  }

  async enable(): Promise<boolean> {
    if (this.enabled) return true;

    const orientationOk = await this.requestOrientation();
    window.addEventListener('deviceorientation', this.onOrientation);
    window.addEventListener('devicemotion', this.onMotion);

    this.enabled = true;
    return orientationOk;
  }

  disable(): void {
    window.removeEventListener('deviceorientation', this.onOrientation);
    window.removeEventListener('devicemotion', this.onMotion);
    this.enabled = false;
  }

  private async requestOrientation(): Promise<boolean> {
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      try {
        const state = await DOE.requestPermission();
        return state === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  private onOrientation = (e: DeviceOrientationEvent): void => {
    if (this.options.skipOrientation?.()) return;
    const now = performance.now();
    if (now - this.lastTilt < TILT_THROTTLE_MS) return;
    this.lastTilt = now;

    const gamma = e.gamma ?? 0;
    const beta = e.beta ?? 0;
    const dGamma = gamma - this.lastGamma;
    const dBeta = beta - this.lastBeta;
    this.lastGamma = gamma;
    this.lastBeta = beta;

    if (Math.abs(gamma) > TILT_THRESHOLD || Math.abs(beta) > TILT_THRESHOLD) {
      this.callbacks.onTilt?.(dGamma, dBeta);
    }

    const shake = Math.hypot(dGamma, dBeta);
    if (shake > SHAKE_THRESHOLD) {
      this.callbacks.onShake?.();
    }
  };

  private onMotion = (e: DeviceMotionEvent): void => {
    const now = performance.now();
    if (now - this.lastMotion < MOTION_THROTTLE_MS) return;
    this.lastMotion = now;

    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const ax = acc.x ?? 0;
    const ay = acc.y ?? 0;
    const az = acc.z ?? 0;
    const magnitude = Math.hypot(ax, ay, az);

    if (magnitude > ACCEL_TAP_THRESHOLD) {
      this.callbacks.onTap?.();
      return;
    }

    if (Math.abs(ax) > SWING_THRESHOLD) {
      this.callbacks.onSwing?.(ax > 0 ? 1 : -1);
    }
  };
}
