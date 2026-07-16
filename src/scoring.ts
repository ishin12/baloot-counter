export type Team = 0 | 1
export type Contract = 'sun' | 'hokm'
export type Multiplier = 1 | 2 | 3 | 4 | 'coffee'
export type ProjectKey = 'sira' | 'fifty' | 'hundred' | 'fourHundred' | 'baloot'

export interface ProjectCounts {
  sira: number
  fifty: number
  hundred: number
  fourHundred: number
  baloot: number
}

export interface RoundDraft {
  buyer: Team
  contract: Contract
  rawPoints: [number, number]
  projects: [ProjectCounts, ProjectCounts]
  multiplier: Multiplier
  manualAward?: [number, number]
}

export interface RoundResult {
  rawPoints: [number, number]
  convertedPoints: [number, number]
  projectPoints: [number, number]
  calculatedPoints: [number, number]
  awarded: [number, number]
  buyerMade: boolean
  winningTeam: Team
  coffeeWinner?: Team
}

export interface RoundRecord extends RoundDraft {
  id: string
  createdAt: number
  result: RoundResult
}

export const RAW_TOTALS: Record<Contract, number> = { sun: 130, hokm: 162 }
export const ROUND_TOTALS: Record<Contract, number> = { sun: 26, hokm: 16 }

export const emptyProjects = (): ProjectCounts => ({
  sira: 0,
  fifty: 0,
  hundred: 0,
  fourHundred: 0,
  baloot: 0,
})

export function createRoundDraft(): RoundDraft {
  return {
    buyer: 0,
    contract: 'sun',
    rawPoints: [0, RAW_TOTALS.sun],
    projects: [emptyProjects(), emptyProjects()],
    multiplier: 1,
  }
}

export function convertRawPoints(raw: number, contract: Contract): number {
  if (contract === 'sun') {
    const remainder = raw % 10
    return remainder === 5 ? raw / 5 : Math.round(raw / 10) * 2
  }
  const tens = Math.floor(raw / 10)
  return raw % 10 <= 5 ? tens : tens + 1
}

export function projectScore(projects: ProjectCounts, contract: Contract): number {
  if (contract === 'sun') {
    return projects.sira * 4 + projects.fifty * 10 + projects.hundred * 20 + projects.fourHundred * 40
  }
  return projects.sira * 2 + projects.fifty * 5 + projects.hundred * 10 + projects.baloot * 2
}

export function calculateRound(draft: RoundDraft, currentScores: [number, number] = [0, 0]): RoundResult {
  const convertedPoints: [number, number] = [
    convertRawPoints(draft.rawPoints[0], draft.contract),
    convertRawPoints(draft.rawPoints[1], draft.contract),
  ]
  const projectPoints: [number, number] = [
    projectScore(draft.projects[0], draft.contract),
    projectScore(draft.projects[1], draft.contract),
  ]
  const calculatedPoints: [number, number] = [
    convertedPoints[0] + projectPoints[0],
    convertedPoints[1] + projectPoints[1],
  ]
  const defender: Team = draft.buyer === 0 ? 1 : 0
  const tied = calculatedPoints[0] === calculatedPoints[1]
  const buyerMade = calculatedPoints[draft.buyer] > calculatedPoints[defender] || (draft.multiplier !== 1 && tied)
  const winningTeam: Team = tied
    ? draft.buyer
    : calculatedPoints[0] > calculatedPoints[1]
      ? 0
      : 1

  let awarded: [number, number]
  let coffeeWinner: Team | undefined

  if (draft.manualAward) {
    awarded = [...draft.manualAward]
  } else if (draft.multiplier === 'coffee') {
    coffeeWinner = winningTeam
    awarded = winningTeam === 0
      ? [Math.max(0, 152 - currentScores[0]), 0]
      : [0, Math.max(0, 152 - currentScores[1])]
  } else if (draft.multiplier > 1) {
    const winningAward = (ROUND_TOTALS[draft.contract] + projectPoints[winningTeam]) * draft.multiplier
    awarded = winningTeam === 0 ? [winningAward, 0] : [0, winningAward]
  } else if (!buyerMade) {
    const defenderAward = ROUND_TOTALS[draft.contract] + projectPoints[defender]
    awarded = draft.buyer === 0 ? [0, defenderAward] : [defenderAward, 0]
  } else {
    awarded = calculatedPoints
  }

  return {
    rawPoints: [...draft.rawPoints],
    convertedPoints,
    projectPoints,
    calculatedPoints,
    awarded,
    buyerMade,
    winningTeam,
    coffeeWinner,
  }
}

export function totalScores(rounds: RoundRecord[]): [number, number] {
  return rounds.reduce<[number, number]>(
    (scores, round) => [scores[0] + round.result.awarded[0], scores[1] + round.result.awarded[1]],
    [0, 0],
  )
}

export function cloneDraft(round: RoundDraft): RoundDraft {
  return {
    buyer: round.buyer,
    contract: round.contract,
    rawPoints: [...round.rawPoints],
    projects: [{ ...round.projects[0] }, { ...round.projects[1] }],
    multiplier: round.multiplier,
    manualAward: round.manualAward ? [...round.manualAward] : undefined,
  }
}
