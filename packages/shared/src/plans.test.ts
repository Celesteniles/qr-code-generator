import { describe, it, expect } from 'vitest'
import { PLANS, canCreateLink } from './plans'

describe('plans', () => {
  it('le palier gratuit plafonne à 25 liens', () => {
    expect(canCreateLink('free', 24)).toBe(true)
    expect(canCreateLink('free', 25)).toBe(false)
    expect(PLANS.free.maxLinks).toBe(25)
  })
  it('le palier pro plafonne à 500', () => {
    expect(canCreateLink('pro', 499)).toBe(true)
    expect(canCreateLink('pro', 500)).toBe(false)
  })
  it('le palier entreprise est illimité', () => {
    expect(canCreateLink('enterprise', 100_000)).toBe(true)
    expect(PLANS.enterprise.maxLinks).toBeNull()
  })
})
