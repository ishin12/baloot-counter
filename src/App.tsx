import { useEffect, useMemo, useRef, useState } from 'react'

type Team = 0 | 1
type Tab = 'score' | 'tap'

interface Round {
  id: string
  points: [number, number]
}

const TARGET = 152

function readRounds(): Round[] {
  try {
    const saved = localStorage.getItem('baloot-simple-rounds-v1')
    return saved ? JSON.parse(saved) as Round[] : []
  } catch {
    return []
  }
}

function readTapCounts(): [number, number] {
  try {
    const saved = localStorage.getItem('baloot-tap-counts-v1')
    return saved ? JSON.parse(saved) as [number, number] : [0, 0]
  } catch {
    return [0, 0]
  }
}

function cleanNumber(value: string) {
  const number = Number(value.replace(/[^0-9]/g, ''))
  return Number.isFinite(number) ? Math.min(999, Math.max(0, Math.round(number))) : 0
}

function Score({ name, value, active, onClick }: {
  name: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={`score-card ${active ? 'active' : ''}`} onClick={onClick} type="button">
      <span>{name}</span>
      <strong>{value}</strong>
    </button>
  )
}

function ConfirmReset({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
        <h2 id="reset-title">صكة جديدة؟</h2>
        <p>راح ينمسح القيد كامل.</p>
        <div className="dialog-actions">
          <button onClick={onCancel}>إلغاء</button>
          <button className="danger" onClick={onConfirm}>امسح</button>
        </div>
      </section>
    </div>
  )
}

function TabSwitch({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tab-switch" aria-label="أقسام التطبيق">
      <button className={active === 'score' ? 'active' : ''} onClick={() => onChange('score')}>القيد</button>
      <button className={active === 'tap' ? 'active' : ''} onClick={() => onChange('tap')}>العداد</button>
    </nav>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('score')
  const [rounds, setRounds] = useState<Round[]>(readRounds)
  const [tapCounts, setTapCounts] = useState<[number, number]>(readTapCounts)
  const [entry, setEntry] = useState<[string, string]>(['', ''])
  const [activeTeam, setActiveTeam] = useState<Team>(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const totals = useMemo<[number, number]>(() => rounds.reduce<[number, number]>(
    (sum, round) => [sum[0] + round.points[0], sum[1] + round.points[1]],
    [0, 0],
  ), [rounds])

  const history = useMemo(() => {
    let running: [number, number] = [0, 0]
    return rounds.map((round, index) => {
      running = [running[0] + round.points[0], running[1] + round.points[1]]
      return { ...round, number: index + 1, totals: [...running] as [number, number] }
    }).reverse()
  }, [rounds])

  useEffect(() => {
    localStorage.setItem('baloot-simple-rounds-v1', JSON.stringify(rounds))
  }, [rounds])

  useEffect(() => {
    localStorage.setItem('baloot-tap-counts-v1', JSON.stringify(tapCounts))
  }, [tapCounts])

  const focusTeam = (team: Team) => {
    setActiveTeam(team)
    inputs[team].current?.focus()
  }

  const saveRound = () => {
    const points: [number, number] = [cleanNumber(entry[0]), cleanNumber(entry[1])]
    if (points[0] === 0 && points[1] === 0) {
      focusTeam(0)
      return
    }

    setRounds((current) => [...current, { id: crypto.randomUUID(), points }])
    setEntry(['', ''])
    focusTeam(0)
  }

  const reset = () => {
    setRounds([])
    setEntry(['', ''])
    setConfirmReset(false)
  }

  const remaining = Math.max(0, TARGET - Math.max(...totals))

  if (tab === 'tap') {
    return (
      <main className="tap-counter" dir="rtl">
        <header className="tap-topbar">
          <button className="tap-reset" onClick={() => setTapCounts([0, 0])} disabled={tapCounts[0] === 0 && tapCounts[1] === 0}>تصفير</button>
          <TabSwitch active={tab} onChange={setTab} />
          <span aria-hidden="true" />
        </header>
        <section className="tap-sides" aria-label="عداد بسيط">
          {([0, 1] as Team[]).map((team) => (
            <section
              key={team}
              className={`tap-side tap-side-${team}`}
              aria-label={`${team === 0 ? 'لنا' : 'لهم'} ${tapCounts[team]}`}
            >
              <span>{team === 0 ? 'لنا' : 'لهم'}</span>
              <strong>{tapCounts[team]}</strong>
              <div className="tap-controls">
                <button
                  className="tap-minus"
                  aria-label={`أنقص ${team === 0 ? 'لنا' : 'لهم'}`}
                  disabled={tapCounts[team] === 0}
                  onClick={() => setTapCounts((current) => team === 0 ? [Math.max(0, current[0] - 1), current[1]] : [current[0], Math.max(0, current[1] - 1)])}
                >−</button>
                <button
                  className="tap-plus"
                  aria-label={`زد ${team === 0 ? 'لنا' : 'لهم'}`}
                  onClick={() => setTapCounts((current) => team === 0 ? [current[0] + 1, current[1]] : [current[0], current[1] + 1])}
                >+</button>
              </div>
            </section>
          ))}
        </section>
      </main>
    )
  }

  return (
    <main className="counter" dir="rtl">
      <header className="topbar">
        <button className="new-game" onClick={() => setConfirmReset(true)} disabled={!rounds.length}>صكة جديدة</button>
        <TabSwitch active={tab} onChange={setTab} />
        <div className="round-count">{rounds.length ? `${rounds.length} جولة` : 'جاهزين'}</div>
      </header>

      <section className="scoreboard" aria-label="مجموع الصكة">
        <Score name="لنا" value={totals[0]} active={activeTeam === 0} onClick={() => focusTeam(0)} />
        <div className="score-divider"><span>إلى</span><b>{TARGET}</b></div>
        <Score name="لهم" value={totals[1]} active={activeTeam === 1} onClick={() => focusTeam(1)} />
      </section>

      <section className="entry-panel" aria-label="تسجيل قيد جديد">
        <p>قيد الجولة</p>
        <div className="entry-row">
          {([0, 1] as Team[]).map((team) => (
            <label className={activeTeam === team ? 'active' : ''} key={team}>
              <span>{team === 0 ? 'لنا' : 'لهم'}</span>
              <input
                ref={inputs[team]}
                value={entry[team]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                aria-label={`قيد ${team === 0 ? 'لنا' : 'لهم'}`}
                onFocus={() => setActiveTeam(team)}
                onChange={(event) => {
                  const value = event.target.value.replace(/[^0-9]/g, '').slice(0, 3)
                  setEntry((current) => team === 0 ? [value, current[1]] : [current[0], value])
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') team === 0 ? focusTeam(1) : saveRound()
                }}
              />
            </label>
          ))}
        </div>
        <button className="save" onClick={saveRound}>سجل</button>
        <small>{remaining > 0 ? `باقي ${remaining} على نهاية الصكة` : 'وصلتم ١٥٢ — خلصت الصكة'}</small>
      </section>

      <section className="history" aria-label="سجل النقاط">
        <header>
          <b>سجل النقاط</b>
          <span><i>لنا</i><i>لهم</i></span>
        </header>
        {history.length === 0 ? (
          <p>أول قيد بيظهر هنا</p>
        ) : (
          <ol>
            {history.map((round) => (
              <li key={round.id}>
                <span className="round-number">{round.number}</span>
                <span><small>+{round.points[0]}</small><b>{round.totals[0]}</b></span>
                <span><small>+{round.points[1]}</small><b>{round.totals[1]}</b></span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="bottom-actions">
        <button className="undo" onClick={() => setRounds((current) => current.slice(0, -1))} disabled={!rounds.length}>
          <span aria-hidden="true">↶</span> تراجع
        </button>
        <div className="last-round">
          <span>آخر قيد</span>
          <b>{rounds.length ? `${rounds.at(-1)?.points[0]} — ${rounds.at(-1)?.points[1]}` : '—'}</b>
        </div>
        <button className="clear" onClick={() => setConfirmReset(true)} disabled={!rounds.length}>
          <span aria-hidden="true">×</span> مسح الكل
        </button>
      </footer>

      {confirmReset && <ConfirmReset onCancel={() => setConfirmReset(false)} onConfirm={reset} />}
    </main>
  )
}
