import { describe, it, expect } from 'vitest'
import { PLANS, canCreateLink } from './plans'

describe('plans', () => {
  it('le palier gratuit plafonne à 10 liens', () => {
    expect(canCreateLink('free', 9)).toBe(true)
    expect(canCreateLink('free', 10)).toBe(false)
    expect(PLANS.free.maxLinks).toBe(10)
  })
  it('le palier pro plafonne à 200', () => {
    expect(canCreateLink('pro', 199)).toBe(true)
    expect(canCreateLink('pro', 200)).toBe(false)
  })
  it('le palier business plafonne à 1 000 et ouvre le domaine personnalisé', () => {
    expect(canCreateLink('business', 999)).toBe(true)
    expect(canCreateLink('business', 1_000)).toBe(false)
    expect(PLANS.business.customDomains).toBe(true)
    expect(PLANS.pro.customDomains).toBe(false)
  })
  it('le palier entreprise est illimité', () => {
    expect(canCreateLink('enterprise', 100_000)).toBe(true)
    expect(PLANS.enterprise.maxLinks).toBeNull()
  })
  it("l'annuel offre deux mois", () => {
    for (const p of [PLANS.pro, PLANS.business]) expect(p.yearlyPrice).toBe(p.monthlyPrice! * 10)
  })
})
