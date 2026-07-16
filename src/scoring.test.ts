import { describe, expect, it } from 'vitest'
import {
  RAW_TOTALS,
  calculateRound,
  convertRawPoints,
  createRoundDraft,
  emptyProjects,
  projectScore,
  totalScores,
  type RoundRecord,
} from './scoring'

describe('Saudi point conversion', () => {
  it('uses half-down rounding in Hokm', () => {
    expect(convertRawPoints(85, 'hokm')).toBe(8)
    expect(convertRawPoints(86, 'hokm')).toBe(9)
  })

  it('keeps exact fives and rounds other Sun values by tens', () => {
    expect(convertRawPoints(24, 'sun')).toBe(4)
    expect(convertRawPoints(25, 'sun')).toBe(5)
    expect(convertRawPoints(26, 'sun')).toBe(6)
  })

  it('uses the correct raw totals', () => {
    expect(RAW_TOTALS).toEqual({ sun: 130, hokm: 162 })
  })
})

describe('projects', () => {
  it('scores Sun projects in registration points', () => {
    expect(projectScore({ ...emptyProjects(), sira: 1, fifty: 1, hundred: 1, fourHundred: 1 }, 'sun')).toBe(74)
  })

  it('scores Hokm projects including Baloot', () => {
    expect(projectScore({ ...emptyProjects(), sira: 1, fifty: 1, hundred: 1, baloot: 1 }, 'hokm')).toBe(19)
  })
})

describe('round outcomes', () => {
  it('registers both teams when the buyer makes a normal Sun round', () => {
    const draft = createRoundDraft()
    draft.rawPoints = [70, 60]
    const result = calculateRound(draft)
    expect(result.buyerMade).toBe(true)
    expect(result.awarded).toEqual([14, 12])
  })

  it('gives the full round to the defender when the buyer falls', () => {
    const draft = createRoundDraft()
    draft.rawPoints = [60, 70]
    const result = calculateRound(draft)
    expect(result.buyerMade).toBe(false)
    expect(result.awarded).toEqual([0, 26])
  })

  it('gives only the winner the multiplied round', () => {
    const draft = createRoundDraft()
    draft.rawPoints = [70, 60]
    draft.multiplier = 2
    expect(calculateRound(draft).awarded).toEqual([52, 0])
  })

  it('ends a coffee round at 152', () => {
    const draft = createRoundDraft()
    draft.rawPoints = [70, 60]
    draft.multiplier = 'coffee'
    const result = calculateRound(draft, [100, 90])
    expect(result.coffeeWinner).toBe(0)
    expect(result.awarded).toEqual([52, 0])
  })

  it('honors a manual correction', () => {
    const draft = createRoundDraft()
    draft.manualAward = [19, 7]
    expect(calculateRound(draft).awarded).toEqual([19, 7])
  })

  it('totals saved rounds', () => {
    const draft = createRoundDraft()
    draft.rawPoints = [70, 60]
    const record = { ...draft, id: 'one', createdAt: 1, result: calculateRound(draft) } as RoundRecord
    expect(totalScores([record, { ...record, id: 'two' }])).toEqual([28, 24])
  })
})
