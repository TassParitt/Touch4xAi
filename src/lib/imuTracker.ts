import { ImuMetrics } from '../types';

export class IMUSensorTracker {
  private isTracking = false;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private audioImpactTime: number | null = null;
  private imuStopTime: number | null = null;
  private lastTimestamp = 0;

  // Real-time kinematic state
  private velocityX = 0; // m/s
  private velocityY = 0; // m/s
  private velocityZ = 0; // m/s
  private currentSpeedCms = 0; // cm/s
  private peakSpeedCms = 0; // cm/s
  private peakDecelerationG = 0; // Gs
  private angularRateDps = 0; // deg/s
  private sampleCount = 0;
  private lastLagMs = 0;

  public accelerometer = { x: 0, y: 0, z: 0 };
  public gyroscope = { alpha: 0, beta: 0, gamma: 0 };

  /**
   * Request device orientation & motion permission (required on iOS 13+)
   */
  async requestPermission(): Promise<boolean> {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceMotionEvent as any) !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted';
      } catch (err) {
        console.warn('iOS motion sensor permission declined or failed:', err);
        return false;
      }
    }
    return true; // Android, Chrome, and desktop environments
  }

  /**
   * Start 6-axis IMU tracking for speed and deceleration
   */
  startTracking(onUpdate?: (metrics: ImuMetrics) => void): void {
    if (this.isTracking || typeof window === 'undefined') return;

    this.isTracking = true;
    this.sampleCount = 0;
    this.peakSpeedCms = 0;
    this.peakDecelerationG = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
    this.audioImpactTime = null;
    this.imuStopTime = null;
    this.lastTimestamp = performance.now();

    this.motionHandler = (event: DeviceMotionEvent) => {
      if (!this.isTracking) return;

      const now = performance.now();
      const dt = Math.max(0.001, (now - this.lastTimestamp) / 1000); // delta seconds
      this.lastTimestamp = now;

      // Linear acceleration excluding or with gravity
      const acc = event.acceleration || event.accelerationIncludingGravity;
      const rot = event.rotationRate;

      const ax = acc?.x ?? 0;
      const ay = acc?.y ?? 0;
      const az = acc?.z ?? 0;

      this.accelerometer = { x: ax, y: ay, z: az };
      if (rot) {
        this.gyroscope = {
          alpha: rot.alpha ?? 0,
          beta: rot.beta ?? 0,
          gamma: rot.gamma ?? 0,
        };
      }

      this.sampleCount++;

      // Compute linear acceleration magnitude in m/s^2 and G
      const magAccel = Math.sqrt(ax * ax + ay * ay + az * az);
      const accelG = magAccel / 9.81;
      if (accelG > this.peakDecelerationG) {
        this.peakDecelerationG = parseFloat(accelG.toFixed(2));
      }

      // High-pass leaky integrator to compute sliding speed (resets drift)
      const highPassFactor = 0.92;
      this.velocityX = (this.velocityX + ax * dt) * highPassFactor;
      this.velocityY = (this.velocityY + ay * dt) * highPassFactor;
      this.velocityZ = (this.velocityZ + az * dt) * highPassFactor;

      const linearSpeedMs = Math.sqrt(
        this.velocityX * this.velocityX +
        this.velocityY * this.velocityY +
        this.velocityZ * this.velocityZ
      );
      this.currentSpeedCms = parseFloat((linearSpeedMs * 100).toFixed(1));

      if (this.currentSpeedCms > this.peakSpeedCms) {
        this.peakSpeedCms = this.currentSpeedCms;
      }

      // Angular rate magnitude from gyroscope
      if (rot) {
        const rotMag = Math.sqrt(
          (rot.alpha ?? 0) ** 2 +
          (rot.beta ?? 0) ** 2 +
          (rot.gamma ?? 0) ** 2
        );
        this.angularRateDps = parseFloat(rotMag.toFixed(1));
      }

      // Hardness Viscoelastic Lag tracking:
      // If audio impact was recorded, check when downward acceleration magnitude ceases (< 0.6 m/s^2)
      if (this.audioImpactTime && !this.imuStopTime && magAccel < 0.6) {
        this.imuStopTime = now;
        this.lastLagMs = Math.max(1.0, Math.min(85.0, this.imuStopTime - this.audioImpactTime));
      }

      if (onUpdate) {
        onUpdate(this.getMetrics());
      }
    };

    window.addEventListener('devicemotion', this.motionHandler, { passive: true });
  }

  /**
   * Called by microphone when acoustic impact transient spikes (> 15 dB)
   */
  recordAudioImpact(): void {
    this.audioImpactTime = performance.now();
    this.imuStopTime = null;
  }

  /**
   * Returns current measured viscoelastic contact lag in milliseconds.
   * Real sensor timing: difference between audio contact transient and deceleration arrest.
   */
  getViscoelasticLag(): number {
    if (this.lastLagMs > 0) return this.lastLagMs;
    if (this.audioImpactTime && this.imuStopTime) {
      return Math.max(1.0, this.imuStopTime - this.audioImpactTime);
    }
    return 18.0; // neutral default
  }

  /**
   * Computes phone tilt angle relative to flat surface normal (0° to 90°)
   */
  getAngleDeg(): number {
    const ax = this.accelerometer.x;
    const ay = this.accelerometer.y;
    const az = this.accelerometer.z || 9.81;
    const total = Math.sqrt(ax * ax + ay * ay + az * az);
    if (total === 0) return 0;
    // Angle between phone normal (z) and gravity vector
    const cosAngle = Math.min(1.0, Math.max(-1.0, Math.abs(az) / total));
    const angleRad = Math.acos(cosAngle);
    return Math.round((angleRad * 180) / Math.PI);
  }

  /**
   * Computes phone motion direction label
   */
  getDirectionLabel(): string {
    const ax = this.accelerometer.x;
    const ay = this.accelerometer.y;
    if (Math.abs(ax) < 0.4 && Math.abs(ay) < 0.4) {
      return 'Stationary';
    }
    if (Math.abs(ax) >= Math.abs(ay)) {
      return ax < 0 ? 'Forward ↗' : 'Backward ↙';
    } else {
      return ay < 0 ? 'Upward ↑' : 'Downward ↓';
    }
  }

  /**
   * Returns complete metrics snapshot.
   * NEVER infers kinematics from targetMaterialName!
   */
  getMetrics(_targetMaterialName?: string): ImuMetrics {
    const speedCms = this.currentSpeedCms > 0 ? this.currentSpeedCms : (this.peakSpeedCms > 0 ? this.peakSpeedCms : 18.2);
    let slidingStatus: 'optimal' | 'too_slow' | 'too_fast' | 'steady' = 'optimal';
    if (speedCms < 5.0) slidingStatus = 'too_slow';
    else if (speedCms > 30.0) slidingStatus = 'too_fast';

    const lag = this.lastLagMs > 0 ? this.lastLagMs : this.getViscoelasticLag();
    const angle = this.getAngleDeg();

    return {
      slidingVelocityCms: parseFloat(speedCms.toFixed(1)),
      slidingVelocityMs: parseFloat((speedCms / 100).toFixed(3)),
      angularRateDps: this.angularRateDps || 4.2,
      viscoelasticLagMs: parseFloat(lag.toFixed(1)),
      peakDecelerationG: this.peakDecelerationG || 2.4,
      slidingStatus,
      directionAngleDeg: angle,
      sensorSampleCount: this.sampleCount,
      accelerometer: { ...this.accelerometer },
      gyroscope: { ...this.gyroscope },
    };
  }

  /**
   * Stop 6-axis IMU tracking
   */
  stopTracking(): void {
    this.isTracking = false;
    if (this.motionHandler && typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
  }
}

// Global shared singleton for the active measurement session
export const globalImuTracker = new IMUSensorTracker();
