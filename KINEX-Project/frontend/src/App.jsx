import { useEffect, useRef, useState } from 'react'

const N = 120
const KEYS = ['ax', 'ay', 'az', 'gx', 'gy', 'gz']
const COLORS = ['#4fd1c5', '#a78bfa', '#f6c453']
const SOURCES = {
  demo: { label: 'Demo data' },
  backend: { label: 'Backend relay', url: 'ws://localhost:8080' },
  esp32: { label: 'ESP32 direct', url: 'ws://192.168.43.15:81' },
}
const empty = () => Object.fromEntries(KEYS.map((k) => [k, []]))

// Draws up to three lines on a canvas
function Chart({ data, keys, range }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = cv.clientHeight
    cv.width = w * dpr
    cv.height = h * dpr
    const c = cv.getContext('2d')
    c.scale(dpr, dpr)
    c.font = '11px sans-serif'
    for (let i = 0; i <= 4; i++) {
      const y = 8 + ((h - 16) * i) / 4
      c.strokeStyle = '#263040'
      c.beginPath(); c.moveTo(34, y); c.lineTo(w, y); c.stroke()
      c.fillStyle = '#8b98a8'
      c.fillText((range - (2 * range * i) / 4).toFixed(range < 5 ? 1 : 0), 0, y + 4)
    }
    keys.forEach((k, j) => {
      c.strokeStyle = COLORS[j]
      c.lineWidth = 2
      c.beginPath()
      data[k].forEach((v, i) => {
        const x = 34 + ((w - 34) * i) / (N - 1)
        const cl = Math.max(-range, Math.min(range, v))
        const y = 8 + (h - 16) * (1 - (cl + range) / (2 * range))
        i ? c.lineTo(x, y) : c.moveTo(x, y)
      })
      c.stroke()
    })
  }, [data, keys, range])
  return <canvas ref={ref} />
}

function Readout({ label, value, color, digits }) {
  return (
    <div className="v" style={{ borderColor: color }}>
      <b>{value.toFixed(digits)}</b>
      <i>{label}</i>
    </div>
  )
}

export default function App() {
  const [source, setSource] = useState('demo')
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState({ text: 'Demo running', ok: true })
  const [hist, setHist] = useState(empty)
  const [last, setLast] = useState({ ax: 0, ay: 0, az: 1, gx: 0, gy: 0, gz: 0 })
  const [hitUntil, setHitUntil] = useState(0)

  const push = (d) => {
    setHist((h) => {
      const n = {}
      KEYS.forEach((k) => (n[k] = [...h[k], Number(d[k]) || 0].slice(-N)))
      return n
    })
    setLast(d)
    if (Math.hypot(d.ax, d.ay, d.az) > 2.2) setHitUntil(Date.now() + 2000)
  }

  // Choose a data source: simulated, backend relay, or ESP32
  useEffect(() => {
    setHist(empty())
    const address = url || SOURCES[source].url
    if (source === 'demo') {
      setStatus({ text: 'Demo running', ok: true })
      let t = 0
      const id = setInterval(() => {
        t += 0.05
        const r = () => Math.random() - 0.5
        push({
          ax: 0.35 * Math.sin(t * 1.3) + 0.03 * r() + (Math.random() < 0.004 ? 2.5 : 0),
          ay: 0.25 * Math.cos(t * 0.9) + 0.03 * r(),
          az: 0.95 + 0.06 * Math.sin(t * 0.5) + 0.03 * r(),
          gx: 40 * Math.cos(t * 0.9) + 4 * r(),
          gy: 55 * Math.sin(t * 1.3) + 4 * r(),
          gz: 18 * Math.sin(t * 0.4) + 3 * r(),
        })
      }, 50)
      return () => clearInterval(id)
    }
    setStatus({ text: 'Connecting...', ok: false })
    const ws = new WebSocket(address)
    ws.onopen = () => setStatus({ text: 'Connected to ' + address, ok: true })
    ws.onmessage = (e) => { try { push(JSON.parse(e.data)) } catch { /* ignore bad packet */ } }
    ws.onerror = () => setStatus({ text: 'Cannot reach ' + address, ok: false })
    ws.onclose = () => setStatus((s) => (s.ok ? { text: 'Disconnected', ok: false } : s))
    return () => { ws.onclose = null; ws.close() }
  }, [source, url])

  const roll = (Math.atan2(last.ay, last.az) * 180) / Math.PI
  const pitch = (Math.atan2(-last.ax, Math.hypot(last.ay, last.az)) * 180) / Math.PI
  const mag = Math.hypot(last.ax, last.ay, last.az)
  const hit = Date.now() < hitUntil

  return (
    <div className="wrap">
      <header>
        <h1>KINEX<small>Wearable motion tracking</small></h1>
        <div className="ctl">
          <select value={source} onChange={(e) => { setUrl(''); setSource(e.target.value) }} aria-label="Data source">
            {Object.entries(SOURCES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          {source !== 'demo' && (
            <input
              defaultValue={SOURCES[source].url}
              key={source}
              onBlur={(e) => setUrl(e.target.value)}
              aria-label="WebSocket address"
            />
          )}
          <div className="status"><span className={'dot' + (status.ok ? '' : ' bad')} />{status.text}</div>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>Accelerometer<span>g</span></h2>
          <div className="vals">
            <Readout label="Accel X" value={last.ax} color={COLORS[0]} digits={2} />
            <Readout label="Accel Y" value={last.ay} color={COLORS[1]} digits={2} />
            <Readout label="Accel Z" value={last.az} color={COLORS[2]} digits={2} />
          </div>
          <Chart data={hist} keys={['ax', 'ay', 'az']} range={2} />
        </section>

        <section className="panel">
          <h2>Gyroscope<span>deg/s</span></h2>
          <div className="vals">
            <Readout label="Gyro X" value={last.gx} color={COLORS[0]} digits={1} />
            <Readout label="Gyro Y" value={last.gy} color={COLORS[1]} digits={1} />
            <Readout label="Gyro Z" value={last.gz} color={COLORS[2]} digits={1} />
          </div>
          <Chart data={hist} keys={['gx', 'gy', 'gz']} range={250} />
        </section>

        <section className="panel tilt">
          <svg width="170" height="170" viewBox="-85 -85 170 170" aria-label="Tilt indicator">
            <defs><clipPath id="cp"><circle r="78" /></clipPath></defs>
            <circle r="80" fill="#0a0e14" stroke="#263040" strokeWidth="2" />
            <g clipPath="url(#cp)">
              <g transform={`rotate(${-roll}) translate(0,${pitch * 1.2})`}>
                <rect x="-200" y="-300" width="400" height="300" fill="#16324a" />
                <rect x="-200" y="0" width="400" height="300" fill="#3a2a1c" />
                <line x1="-200" x2="200" y1="0" y2="0" stroke="#e6edf3" strokeWidth="2" />
              </g>
            </g>
            <path d="M-30 0H-10M10 0H30M0 -4V6" stroke="#f6c453" strokeWidth="3" fill="none" />
          </svg>
          <div className="info">
            <h2>Orientation</h2>
            <p>Roll <strong>{roll.toFixed(1)}°</strong> &nbsp; Pitch <strong>{pitch.toFixed(1)}°</strong></p>
            <p>Total motion <strong>{mag.toFixed(2)} g</strong></p>
            <div className={'alert' + (hit ? ' hit' : '')}>{hit ? 'Sudden impact detected' : 'No sudden impact'}</div>
          </div>
        </section>
      </div>
    </div>
  )
}
