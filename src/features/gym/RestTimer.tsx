import { useState, useEffect, useRef } from 'react'

type Props = {
  initialSeconds?: number
  onClose?: () => void
}

export default function RestTimer({ initialSeconds = 90, onClose }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    setSecondsLeft(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1)
      }, 1000)
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false)
      playChime()
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, secondsLeft])

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioContextRef.current || new AudioCtx()
      audioContextRef.current = ctx

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.8)
    } catch {
      // Audio autoplay policy catch
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const startWithDuration = (duration: number) => {
    setSecondsLeft(duration)
    setIsRunning(true)
  }

  if (isMinimized) {
    return (
      <div
        className={`timer-pill ${isRunning ? 'is-running' : ''}`}
        onClick={() => setIsMinimized(false)}
        title="Open Rest Timer"
      >
        <span>Rest: {formatTime(secondsLeft)}</span>
        <button
          type="button"
          className="ghost sm"
          style={{ padding: '2px 8px', fontSize: '11px' }}
          onClick={(e) => {
            e.stopPropagation()
            setIsRunning((v) => !v)
          }}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
      </div>
    )
  }

  return (
    <div className="rest-timer-card">
      <div className="rest-timer-head">
        <span className="rest-timer-title">Rest Timer</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className="ghost sm"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            –
          </button>
          {onClose && (
            <button
              type="button"
              className="ghost sm"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="rest-timer-body">
        <div className={`rest-timer-display ${isRunning ? 'is-running' : secondsLeft === 0 ? 'is-done' : ''}`}>
          {formatTime(secondsLeft)}
        </div>

        <div className="rest-timer-presets">
          <button type="button" className="timer-preset-btn" onClick={() => startWithDuration(60)}>
            60s
          </button>
          <button type="button" className="timer-preset-btn" onClick={() => startWithDuration(90)}>
            90s
          </button>
          <button type="button" className="timer-preset-btn" onClick={() => startWithDuration(120)}>
            2m
          </button>
          <button type="button" className="timer-preset-btn" onClick={() => startWithDuration(180)}>
            3m
          </button>
        </div>

        <div className="rest-timer-controls">
          <button
            type="button"
            className={isRunning ? 'ghost' : 'primary'}
            onClick={() => setIsRunning((v) => !v)}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setIsRunning(false)
              setSecondsLeft(initialSeconds)
            }}
          >
            Reset
          </button>
          <div className="rest-timer-custom">
            <input
              type="number"
              min="10"
              max="600"
              placeholder="Sec"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(customInput, 10)
                  if (val > 0) {
                    startWithDuration(val)
                    setCustomInput('')
                  }
                }
              }}
            />
            <button
              type="button"
              className="ghost sm"
              onClick={() => {
                const val = parseInt(customInput, 10)
                if (val > 0) {
                  startWithDuration(val)
                  setCustomInput('')
                }
              }}
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
