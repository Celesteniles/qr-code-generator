import { describe, it, expect } from 'vitest'
import { PLANS, canCreateLink, isPayablePlan, planPrice } from './plans'

describe('plans', () => {
  it('le palier gratuit plafonne à 10 liens', () => {
    expect(canCreateLink('free', 9)).toBe(true)
    expect(canCreateLink('free', 10)).toBe(false)
    expect(PLANS.free.maxLinks).toBe(10)
  })
  it('le palier pro plafonne à 100', () => {
    expect(canCreateLink('pro', 99)).toBe(true)
    expect(canCreateLink('pro', 100)).toBe(false)
  })
  it('le palier business plafonne à 500 et ouvre le domaine personnalisé', () => {
    expect(canCreateLink('business', 499)).toBe(true)
    expect(canCreateLink('business', 500)).toBe(false)
    expect(PLANS.business.customDomains).toBe(true)
    expect(PLANS.pro.customDomains).toBe(false)
  })
  it('le palier entreprise est illimité', () => {
    expect(canCreateLink('enterprise', 100_000)).toBe(true)
    expect(PLANS.enterprise.maxLinks).toBeNull()
  })
  it("l'annuel coûte moins que douze mois", () => {
    for (const p of [PLANS.pro, PLANS.business]) expect(p.yearlyPrice!).toBeLessThan(p.monthlyPrice! * 12)
  })
  it('seuls Pro et Business se paient en ligne, au prix de PLANS', () => {
    expect(isPayablePlan('pro')).toBe(true)
    expect(isPayablePlan('enterprise')).toBe(false)
    expect(isPayablePlan('free')).toBe(false)
    expect(planPrice('pro', 'month')).toBe(1_500)
    expect(planPrice('pro', 'year')).toBe(13_000)
    expect(planPrice('business', 'year')).toBe(100_000)
  })
})
