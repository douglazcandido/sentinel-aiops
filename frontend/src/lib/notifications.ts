const ACK_COUNT_KEY = "sentinel_notif_ack_count"
const LOGIN_TOAST_PENDING_KEY = "sentinel_notif_login_toast_pending"

/** Highest recomendações total the user has already acknowledged (viewed or dismissed). */
export function readAckCount(): number {
  const raw = localStorage.getItem(ACK_COUNT_KEY)
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

export function writeAckCount(total: number): void {
  localStorage.setItem(ACK_COUNT_KEY, String(total))
}

/** Marks that the next successful recomendações fetch should surface the login toast. */
export function markLoginToastPending(): void {
  sessionStorage.setItem(LOGIN_TOAST_PENDING_KEY, "1")
}

/** Reads and clears the pending flag; returns whether a toast should be shown. */
export function consumeLoginToastPending(): boolean {
  const pending = sessionStorage.getItem(LOGIN_TOAST_PENDING_KEY) === "1"
  sessionStorage.removeItem(LOGIN_TOAST_PENDING_KEY)
  return pending
}

/** Plays a short two-tone notification chime via the Web Audio API — no audio asset needed. */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.15, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration + 0.02)
    }

    playTone(880, 0, 0.14)
    playTone(1318.5, 0.12, 0.18)

    setTimeout(() => ctx.close(), 600)
  } catch {
    // Sound is a non-critical enhancement — ignore autoplay/API failures.
  }
}
