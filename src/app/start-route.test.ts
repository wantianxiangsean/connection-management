import { describe, expect, it } from 'vitest'
import { clearSettingsFromStartUrl } from './start-route'

describe('start route', () => {
  it('drops a settings hash so the archive opens first', () => {
    window.history.replaceState(null, '', '/connection-management/#/settings')
    clearSettingsFromStartUrl()
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/connection-management/')
  })

  it('drops settings subroutes as well', () => {
    window.history.replaceState(null, '', '/#/settings/fields')
    clearSettingsFromStartUrl()
    expect(window.location.hash).toBe('')
  })

  it('keeps deep links to people and other routes', () => {
    window.history.replaceState(null, '', '/#/people/person-1')
    clearSettingsFromStartUrl()
    expect(window.location.hash).toBe('#/people/person-1')
  })
})
