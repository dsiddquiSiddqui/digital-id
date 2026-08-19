export type ThemeKey = 'command-blue' | 'ember-ops' | 'forest-shift'

export type OrganizationTheme = {
  key: ThemeKey
  name: string
  description: string
  primaryColor: string
  accentColor: string
  surfaceColor: string
}

export const ORGANIZATION_THEMES: OrganizationTheme[] = [
  {
    key: 'command-blue',
    name: 'Command Blue',
    description: 'Clean control-room blue for security operations.',
    primaryColor: '#0f6bff',
    accentColor: '#10b981',
    surfaceColor: '#f8fafc',
  },
  {
    key: 'ember-ops',
    name: 'Ember Ops',
    description: 'High-contrast charcoal with warm amber accents.',
    primaryColor: '#f97316',
    accentColor: '#111827',
    surfaceColor: '#fff7ed',
  },
  {
    key: 'forest-shift',
    name: 'Forest Shift',
    description: 'Deep green identity for field teams and sites.',
    primaryColor: '#047857',
    accentColor: '#0f766e',
    surfaceColor: '#f0fdf4',
  },
]

export function getTheme(themeKey: string | null | undefined) {
  return (
    ORGANIZATION_THEMES.find((theme) => theme.key === themeKey) ??
    ORGANIZATION_THEMES[0]
  )
}
