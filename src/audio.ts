export type SoundKey =
  | 'roundWin'
  | 'roundLose'
  | 'buyerFell'
  | 'leadBig'
  | 'trailBig'
  | 'gameWin'
  | 'gameLose'
  | 'invalid'

export const CALLOUTS: Record<SoundKey, string> = {
  roundWin: 'كفو يا وحوش… كذا القيد ولا بلاش!',
  roundLose: 'حتى الحسبة ما وقفت معكم!',
  buyerFell: 'راحت الطلبة يا حبيبي!',
  leadBig: 'يا ساتر، وينهم؟ توّهم يدورون النشرة!',
  trailBig: 'شدّوا حيلكم… النشرة صارت طويلة عليكم!',
  gameWin: 'صبّوا القهوة… المجلس مجلسنا الليلة!',
  gameLose: 'قهوة للغالب… والخاسر يغسل الفناجيل!',
  invalid: 'الحسبة فيها علوم… راجعها!',
}

let activeSpeech: SpeechSynthesisUtterance | undefined

function speakFallback(key: SoundKey) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  activeSpeech = new SpeechSynthesisUtterance(CALLOUTS[key])
  activeSpeech.lang = 'ar-SA'
  activeSpeech.rate = 1.03
  activeSpeech.pitch = key === 'gameLose' || key === 'roundLose' ? 0.82 : 1.08
  window.speechSynthesis.speak(activeSpeech)
}

export function playCallout(key: SoundKey, enabled: boolean) {
  if (!enabled) return
  const audio = new Audio(`/sounds/${key}.mp3`)
  let usedFallback = false
  const fallback = () => {
    if (usedFallback) return
    usedFallback = true
    speakFallback(key)
  }
  audio.addEventListener('error', fallback, { once: true })
  void audio.play().catch(fallback)
}
