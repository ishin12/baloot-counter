import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RAW_TOTALS,
  calculateRound,
  cloneDraft,
  createRoundDraft,
  emptyProjects,
  totalScores,
  type Contract,
  type Multiplier,
  type ProjectCounts,
  type ProjectKey,
  type RoundDraft,
  type RoundRecord,
  type Team,
} from './scoring'
import { CALLOUTS, playCallout, type SoundKey } from './audio'

interface Settings {
  names: [string, string]
  sound: boolean
  keepAwake: boolean
}

const DEFAULT_SETTINGS: Settings = {
  names: ['لنا', 'لهم'],
  sound: true,
  keepAwake: true,
}

const MULTIPLIERS: Array<{ value: Multiplier; label: string; mark: string }> = [
  { value: 1, label: 'عادي', mark: '×١' },
  { value: 2, label: 'دبل', mark: '×٢' },
  { value: 3, label: 'ثري', mark: '×٣' },
  { value: 4, label: 'فور', mark: '×٤' },
  { value: 'coffee', label: 'قهوة', mark: '☕' },
]

const PROJECTS: Array<{ key: ProjectKey; label: string; contracts: Contract[]; max: number }> = [
  { key: 'sira', label: 'سرا', contracts: ['sun', 'hokm'], max: 2 },
  { key: 'fifty', label: 'خمسين', contracts: ['sun', 'hokm'], max: 2 },
  { key: 'hundred', label: 'مية', contracts: ['sun', 'hokm'], max: 2 },
  { key: 'fourHundred', label: 'أربع مية', contracts: ['sun'], max: 1 },
  { key: 'baloot', label: 'بلوت', contracts: ['hokm'], max: 1 },
]

function safeRead<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function formatMultiplier(multiplier: Multiplier) {
  return MULTIPLIERS.find((item) => item.value === multiplier)?.label ?? 'عادي'
}

function formatContract(contract: Contract) {
  return contract === 'sun' ? 'صن' : 'حكم'
}

function projectSummary(projects: ProjectCounts) {
  return PROJECTS
    .filter((project) => projects[project.key] > 0)
    .map((project) => `${project.label}${projects[project.key] > 1 ? ` ×${projects[project.key]}` : ''}`)
    .join('، ')
}

function Brand() {
  return <div className="brand"><span>ق</span><b>قيد البلوت</b></div>
}

function IconButton({ label, children, onClick, danger = false }: {
  label: string
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return <button className={`icon-button ${danger ? 'danger' : ''}`} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

function TeamScore({ team, name, score, target }: { team: Team; name: string; score: number; target: number }) {
  const percent = Math.min(100, (score / target) * 100)
  return (
    <section className={`team-score team-${team}`} aria-label={`${name} ${score}`}>
      <div className="team-heading"><span className="team-mark">{team === 0 ? 'ل' : 'ه'}</span><h2>{name}</h2></div>
      <strong className="score-number">{score}</strong>
      <div className="score-progress"><i style={{ width: `${percent}%` }} /></div>
      <small>{Math.max(0, target - score)} للباقي</small>
    </section>
  )
}

function Scoreboard({ names, scores }: { names: [string, string]; scores: [number, number] }) {
  const difference = Math.abs(scores[0] - scores[1])
  const leader = scores[0] === scores[1] ? undefined : scores[0] > scores[1] ? 0 : 1
  return (
    <div className="scoreboard">
      <TeamScore team={0} name={names[0]} score={scores[0]} target={152} />
      <div className="target-spine" aria-hidden="true">
        <span>الهدف</span>
        <b>١٥٢</b>
        <i />
        <small>{leader === undefined ? 'تعادل' : `الفرق ${difference}`}</small>
      </div>
      <TeamScore team={1} name={names[1]} score={scores[1]} target={152} />
    </div>
  )
}

function NumberEntry({ team, value, name, total, onChange }: {
  team: Team
  value: number
  name: string
  total: number
  onChange: (value: number) => void
}) {
  const bump = (amount: number) => onChange(Math.max(0, Math.min(total, value + amount)))
  return (
    <div className={`number-entry entry-${team}`}>
      <label htmlFor={`raw-${team}`}><span>{name}</span><small>أبناط</small></label>
      <div className="number-control">
        <button type="button" onClick={() => bump(-1)} aria-label={`أنقص أبناط ${name}`}>−</button>
        <input
          id={`raw-${team}`}
          type="number"
          inputMode="numeric"
          min="0"
          max={total}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <button type="button" onClick={() => bump(1)} aria-label={`زد أبناط ${name}`}>+</button>
      </div>
    </div>
  )
}

function ProjectPicker({ team, name, values, contract, onChange }: {
  team: Team
  name: string
  values: ProjectCounts
  contract: Contract
  onChange: (key: ProjectKey, value: number) => void
}) {
  return (
    <div className={`project-team project-team-${team}`}>
      <strong>{name}</strong>
      <div className="project-buttons">
        {PROJECTS.filter((project) => project.contracts.includes(contract)).map((project) => {
          const count = values[project.key]
          return (
            <button
              type="button"
              key={project.key}
              className={count > 0 ? 'selected' : ''}
              onClick={() => onChange(project.key, count >= project.max ? 0 : count + 1)}
              aria-pressed={count > 0}
            >
              {project.label}
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RoundEditor({ names, scores, initial, onClose, onSave }: {
  names: [string, string]
  scores: [number, number]
  initial?: RoundRecord
  onClose: () => void
  onSave: (draft: RoundDraft, initial?: RoundRecord) => void
}) {
  const [draft, setDraft] = useState<RoundDraft>(() => initial ? cloneDraft(initial) : createRoundDraft())
  const [manual, setManual] = useState(Boolean(initial?.manualAward))
  const result = useMemo(() => calculateRound(draft, scores), [draft, scores])
  const total = RAW_TOTALS[draft.contract]
  const validRaw = draft.rawPoints[0] >= 0 && draft.rawPoints[1] >= 0 && draft.rawPoints[0] + draft.rawPoints[1] === total

  const setContract = (contract: Contract) => {
    const nextTotal = RAW_TOTALS[contract]
    setDraft((current) => ({
      ...current,
      contract,
      rawPoints: [0, nextTotal],
      projects: [emptyProjects(), emptyProjects()],
      manualAward: undefined,
    }))
    setManual(false)
  }

  const setRaw = (team: Team, rawValue: number) => {
    const value = Number.isFinite(rawValue) ? Math.max(0, Math.min(total, Math.round(rawValue))) : 0
    setDraft((current) => ({
      ...current,
      rawPoints: team === 0 ? [value, total - value] : [total - value, value],
    }))
  }

  const setProject = (team: Team, key: ProjectKey, value: number) => {
    setDraft((current) => {
      const projects: [ProjectCounts, ProjectCounts] = [{ ...current.projects[0] }, { ...current.projects[1] }]
      projects[team][key] = value
      return { ...current, projects }
    })
  }

  const toggleManual = () => {
    if (manual) {
      setManual(false)
      setDraft((current) => ({ ...current, manualAward: undefined }))
    } else {
      setManual(true)
      setDraft((current) => ({ ...current, manualAward: [...result.awarded] }))
    }
  }

  const setManualAward = (team: Team, value: number) => {
    setDraft((current) => {
      const award: [number, number] = current.manualAward ? [...current.manualAward] : [...result.awarded]
      award[team] = Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
      return { ...current, manualAward: award }
    })
  }

  return (
    <div className="modal-scrim">
      <section className="round-editor" role="dialog" aria-modal="true" aria-label={initial ? 'تعديل الجولة' : 'تسجيل جولة'}>
        <header className="editor-header">
          <div><span>الجولة {initial ? 'المسجلة' : 'الجديدة'}</span><h2>{initial ? 'عدّل القيد' : 'وش صار؟'}</h2></div>
          <button className="close-button" onClick={onClose} aria-label="إغلاق">×</button>
        </header>

        <div className="editor-scroll">
          <div className="selection-row two-options" aria-label="نوع اللعب">
            <button className={draft.contract === 'sun' ? 'selected' : ''} onClick={() => setContract('sun')}><span>☀</span> صن</button>
            <button className={draft.contract === 'hokm' ? 'selected' : ''} onClick={() => setContract('hokm')}><span>♛</span> حكم</button>
          </div>

          <section className="editor-section buyer-section">
            <div className="section-title"><b>من المشترى؟</b><small>الفريق الذي طلب اللعب</small></div>
            <div className="selection-row two-options buyer-options">
              {[0, 1].map((team) => (
                <button key={team} className={draft.buyer === team ? 'selected' : ''} onClick={() => setDraft((current) => ({ ...current, buyer: team as Team }))}>{names[team]}</button>
              ))}
            </div>
          </section>

          <section className="editor-section raw-section">
            <div className="section-title"><b>الأبناط</b><small>اكتب جهة واحدة—الثانية تتحسب تلقائياً</small></div>
            <div className="raw-grid">
              <NumberEntry team={0} value={draft.rawPoints[0]} name={names[0]} total={total} onChange={(value) => setRaw(0, value)} />
              <div className="raw-total"><span>المجموع</span><b>{total}</b></div>
              <NumberEntry team={1} value={draft.rawPoints[1]} name={names[1]} total={total} onChange={(value) => setRaw(1, value)} />
            </div>
          </section>

          <section className="editor-section projects-section">
            <div className="section-title"><b>المشاريع المحتسبة</b><small>اضغط مرة، ومرتين للمشروع المكرر</small></div>
            <div className="projects-grid">
              <ProjectPicker team={0} name={names[0]} values={draft.projects[0]} contract={draft.contract} onChange={(key, value) => setProject(0, key, value)} />
              <ProjectPicker team={1} name={names[1]} values={draft.projects[1]} contract={draft.contract} onChange={(key, value) => setProject(1, key, value)} />
            </div>
          </section>

          <section className="editor-section multiplier-section">
            <div className="section-title"><b>اللعب</b><small>اختر المضاعف إن وجد</small></div>
            <div className="multiplier-options">
              {MULTIPLIERS.map((item) => (
                <button key={String(item.value)} className={draft.multiplier === item.value ? 'selected' : ''} onClick={() => setDraft((current) => ({ ...current, multiplier: item.value }))}>
                  <span>{item.mark}</span>{item.label}
                </button>
              ))}
            </div>
          </section>

          <section className={`calculation-preview ${!result.buyerMade && draft.multiplier === 1 ? 'buyer-fell' : ''}`}>
            <div className="preview-heading">
              <span>{draft.manualAward ? 'القيد اليدوي' : 'القيد المتوقع'}</span>
              {!result.buyerMade && draft.multiplier === 1 && <b>طاحت الطلبة</b>}
              {result.coffeeWinner !== undefined && <b>قهوة لـ {names[result.coffeeWinner]}</b>}
            </div>
            <div className="preview-scores">
              <div><small>{names[0]}</small><strong>{result.awarded[0]}</strong></div>
              <span>—</span>
              <div><small>{names[1]}</small><strong>{result.awarded[1]}</strong></div>
            </div>
            <div className="preview-breakdown">
              <span>بعد التحويل {result.convertedPoints[0]} / {result.convertedPoints[1]}</span>
              <span>المشاريع {result.projectPoints[0]} / {result.projectPoints[1]}</span>
            </div>
          </section>

          <label className="manual-toggle">
            <input type="checkbox" checked={manual} onChange={toggleManual} />
            <span><b>تعديل القيد يدوياً</b><small>لأي اختلاف في قواعد المجلس</small></span>
          </label>

          {manual && (
            <div className="manual-fields">
              {[0, 1].map((team) => (
                <label key={team}>{names[team]}<input type="number" min="0" inputMode="numeric" value={draft.manualAward?.[team] ?? 0} onChange={(event) => setManualAward(team as Team, Number(event.target.value))} /></label>
              ))}
            </div>
          )}
        </div>

        <footer className="editor-footer">
          <button className="secondary-button" onClick={onClose}>إلغاء</button>
          <button className="primary-button" disabled={!validRaw} onClick={() => onSave(draft, initial)}>{initial ? 'احفظ التعديل' : 'قيّد الجولة'}</button>
        </footer>
      </section>
    </div>
  )
}

function History({ rounds, names, onEdit }: {
  rounds: RoundRecord[]
  names: [string, string]
  onEdit: (round: RoundRecord) => void
}) {
  if (rounds.length === 0) {
    return (
      <div className="empty-history">
        <span className="empty-tallies">╱ ╱ ╱ ╱</span>
        <h3>النشرة نظيفة</h3>
        <p>سجّل أول جولة، والحسبة علينا.</p>
      </div>
    )
  }

  return (
    <ol className="round-list">
      {[...rounds].reverse().map((round, reverseIndex) => {
        const index = rounds.length - reverseIndex
        const project0 = projectSummary(round.projects[0])
        const project1 = projectSummary(round.projects[1])
        return (
          <li key={round.id}>
            <button className="round-row" onClick={() => onEdit(round)}>
              <span className="round-index">{String(index).padStart(2, '0')}</span>
              <span className={`contract-stamp ${round.contract}`}><b>{formatContract(round.contract)}</b><small>{formatMultiplier(round.multiplier)}</small></span>
              <span className="round-story">
                <b>المشترى: {names[round.buyer]}</b>
                <small>{project0 || project1 ? `${project0 ? `${names[0]}: ${project0}` : ''}${project0 && project1 ? ' · ' : ''}${project1 ? `${names[1]}: ${project1}` : ''}` : 'بدون مشاريع'}</small>
              </span>
              <span className="round-award us"><small>{names[0]}</small><b>+{round.result.awarded[0]}</b></span>
              <span className="round-divider" />
              <span className="round-award them"><small>{names[1]}</small><b>+{round.result.awarded[1]}</b></span>
              <span className="edit-mark">تعديل</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function SettingsDrawer({ settings, onChange, onClose }: {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
}) {
  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="إغلاق">×</button>
        <span className="drawer-kicker">إعداد المجلس</span>
        <h2>على كيفكم</h2>
        <div className="settings-fields">
          <label>اسم فريقنا<input value={settings.names[0]} maxLength={16} onChange={(event) => onChange({ ...settings, names: [event.target.value || 'لنا', settings.names[1]] })} /></label>
          <label>اسم فريقهم<input value={settings.names[1]} maxLength={16} onChange={(event) => onChange({ ...settings, names: [settings.names[0], event.target.value || 'لهم'] })} /></label>
        </div>
        <label className="setting-switch"><span><b>التعليقات الصوتية</b><small>عبارات خفيفة وقت الفوز والخسارة</small></span><input type="checkbox" checked={settings.sound} onChange={(event) => onChange({ ...settings, sound: event.target.checked })} /></label>
        <label className="setting-switch"><span><b>خلّ الشاشة شغالة</b><small>يمنع نوم الشاشة أثناء الصكة إذا سمح الجهاز</small></span><input type="checkbox" checked={settings.keepAwake} onChange={(event) => onChange({ ...settings, keepAwake: event.target.checked })} /></label>
        <div className="drawer-note">الحفظ تلقائي على هذا الجهاز. ما فيه حساب، ولا بيانات تطلع من الجوال.</div>
      </aside>
    </div>
  )
}

function RulesDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside className="drawer rules-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="إغلاق">×</button>
        <span className="drawer-kicker">كيف يحسب؟</span>
        <h2>الحسبة باختصار</h2>
        <div className="rule"><b>الصن</b><p>مجموع الأبناط ١٣٠، وتتحول إلى ٢٦ في القيد.</p></div>
        <div className="rule"><b>الحكم</b><p>مجموع الأبناط ١٦٢، وتتحول إلى ١٦ في القيد مع تقريب النصف للأسفل.</p></div>
        <div className="rule"><b>طاحت الطلبة</b><p>إذا ما تعدى المشترى خصمه في اللعب العادي، يروح كامل قيد الجولة للخصم.</p></div>
        <div className="rule"><b>الدبل وما بعده</b><p>الفائز يأخذ كامل الجولة مضروباً في المضاعف. في التعادل المدبل يفوز المشترى.</p></div>
        <div className="rule"><b>اختلاف المجلس</b><p>راجع القيد المتوقع قبل الحفظ، واستخدم التعديل اليدوي لأي قاعدة تختلف عندكم.</p></div>
      </aside>
    </div>
  )
}

function ConfirmReset({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-scrim confirm-scrim">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true">
        <span>صكة جديدة</span>
        <h2>نمسح النشرة؟</h2>
        <p>كل الجولات المسجلة في هذه الصكة بتنحذف من الجهاز.</p>
        <div><button className="secondary-button" onClick={onCancel}>خلّها</button><button className="danger-button" onClick={onConfirm}>امسح وابدأ</button></div>
      </section>
    </div>
  )
}

function WinnerDialog({ winner, name, score, onClose, onNewGame }: {
  winner: Team
  name: string
  score: number
  onClose: () => void
  onNewGame: () => void
}) {
  return (
    <div className="modal-scrim winner-scrim">
      <section className={`winner-dialog winner-${winner}`}>
        <span className="winner-rays" aria-hidden="true">✦</span>
        <small>خلصت الصكة</small>
        <h2>{name} فازوا</h2>
        <strong>{score}</strong>
        <p>{winner === 0 ? 'صبّوا القهوة… المجلس مجلسنا.' : 'القهوة لهم… والحسبة علينا.'}</p>
        <div><button className="secondary-button" onClick={onClose}>راجع النشرة</button><button className="primary-button" onClick={onNewGame}>صكة جديدة</button></div>
      </section>
    </div>
  )
}

export default function App() {
  const [rounds, setRounds] = useState<RoundRecord[]>(() => safeRead('baloot-rounds-v1', []))
  const [settings, setSettings] = useState<Settings>(() => safeRead('baloot-settings-v1', DEFAULT_SETTINGS))
  const [editor, setEditor] = useState<RoundRecord | 'new'>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [winnerDismissed, setWinnerDismissed] = useState(false)
  const [callout, setCallout] = useState<string>()
  const wakeLock = useRef<{ release: () => Promise<void> } | undefined>(undefined)
  const calloutTimer = useRef<number | undefined>(undefined)
  const scores = useMemo(() => totalScores(rounds), [rounds])
  const winner: Team | undefined = scores[0] >= 152 ? 0 : scores[1] >= 152 ? 1 : undefined

  useEffect(() => localStorage.setItem('baloot-rounds-v1', JSON.stringify(rounds)), [rounds])
  useEffect(() => localStorage.setItem('baloot-settings-v1', JSON.stringify(settings)), [settings])

  useEffect(() => {
    const requestAgain = () => {
      if (document.visibilityState === 'visible' && settings.keepAwake) void requestWakeLock()
    }
    document.addEventListener('visibilitychange', requestAgain)
    return () => document.removeEventListener('visibilitychange', requestAgain)
  }, [settings.keepAwake])

  async function requestWakeLock() {
    if (!settings.keepAwake || !('wakeLock' in navigator)) return
    try {
      wakeLock.current = await (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen')
    } catch {
      // Some browsers only allow wake lock after installation or a user gesture.
    }
  }

  const announce = (key: SoundKey) => {
    setCallout(CALLOUTS[key])
    playCallout(key, settings.sound)
    if (calloutTimer.current) window.clearTimeout(calloutTimer.current)
    calloutTimer.current = window.setTimeout(() => setCallout(undefined), 3200)
  }

  const openNewRound = () => {
    void requestWakeLock()
    setEditor('new')
  }

  const saveRound = (draft: RoundDraft, initial?: RoundRecord) => {
    const withoutEdited = initial ? rounds.filter((round) => round.id !== initial.id) : rounds
    const scoresBefore = totalScores(withoutEdited)
    const result = calculateRound(draft, scoresBefore)
    const record: RoundRecord = {
      ...cloneDraft(draft),
      id: initial?.id ?? crypto.randomUUID(),
      createdAt: initial?.createdAt ?? Date.now(),
      result,
    }
    const nextRounds = initial
      ? rounds.map((round) => round.id === initial.id ? record : round)
      : [...rounds, record]
    const nextScores = totalScores(nextRounds)
    const oldGap = Math.abs(scores[0] - scores[1])
    const newGap = Math.abs(nextScores[0] - nextScores[1])

    setRounds(nextRounds)
    setEditor(undefined)
    setWinnerDismissed(false)

    if (nextScores[0] >= 152 || nextScores[1] >= 152) announce(nextScores[0] >= 152 ? 'gameWin' : 'gameLose')
    else if (oldGap < 40 && newGap >= 40) announce(nextScores[0] > nextScores[1] ? 'leadBig' : 'trailBig')
    else if (!result.buyerMade && draft.multiplier === 1) announce('buyerFell')
    else announce(result.awarded[0] >= result.awarded[1] ? 'roundWin' : 'roundLose')
  }

  const resetGame = () => {
    setRounds([])
    setConfirmReset(false)
    setWinnerDismissed(false)
    setCallout(undefined)
  }

  const undoLast = () => {
    if (!rounds.length) return
    setRounds((current) => current.slice(0, -1))
    setWinnerDismissed(false)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-context"><span>صكة المجلس</span><b>{rounds.length} {rounds.length === 1 ? 'جولة' : 'جولات'}</b></div>
        <div className="header-actions">
          <IconButton label="شرح الحسبة" onClick={() => setRulesOpen(true)}>؟</IconButton>
          <IconButton label="الإعدادات" onClick={() => setSettingsOpen(true)}>⚙</IconButton>
        </div>
      </header>

      <section className="score-stage">
        <Scoreboard names={settings.names} scores={scores} />
        <div className="score-actions">
          <button className="primary-button add-round" onClick={openNewRound}><span>＋</span> سجّل جولة</button>
          <button className="utility-button" disabled={!rounds.length} onClick={undoLast}>تراجع عن الأخيرة</button>
          <button className="utility-button" disabled={!rounds.length} onClick={() => setConfirmReset(true)}>صكة جديدة</button>
        </div>
      </section>

      <section className="history-section">
        <header><div><span>النشرة</span><h2>سجل الجولات</h2></div>{rounds.length > 0 && <small>اضغط أي جولة لتعديلها</small>}</header>
        <History rounds={rounds} names={settings.names} onEdit={(round) => setEditor(round)} />
      </section>

      <footer className="app-footer"><span>يحفظ تلقائياً على جهازك</span><b>١٥٢</b><span>بدون تسجيل · بدون إنترنت</span></footer>

      {editor && <RoundEditor names={settings.names} scores={scores} initial={editor === 'new' ? undefined : editor} onClose={() => setEditor(undefined)} onSave={saveRound} />}
      {settingsOpen && <SettingsDrawer settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}
      {rulesOpen && <RulesDrawer onClose={() => setRulesOpen(false)} />}
      {confirmReset && <ConfirmReset onCancel={() => setConfirmReset(false)} onConfirm={resetGame} />}
      {winner !== undefined && !winnerDismissed && <WinnerDialog winner={winner} name={settings.names[winner]} score={scores[winner]} onClose={() => setWinnerDismissed(true)} onNewGame={() => setConfirmReset(true)} />}
      {callout && <div className="callout" role="status"><span>📣</span><b>{callout}</b></div>}
    </main>
  )
}
