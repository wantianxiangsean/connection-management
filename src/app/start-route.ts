export function clearSettingsFromStartUrl() {
  const hash = window.location.hash
  if (hash === '#/settings' || hash.startsWith('#/settings/')) {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
  }
}
