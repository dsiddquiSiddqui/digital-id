export type IdCardTemplate = {
  layout: 'classic' | 'compact' | 'bold'
  orientation: 'portrait' | 'landscape'
  primaryColor: string
  accentColor: string
  showLogo: boolean
  showQr: boolean
  showSia: boolean
  showIssueDate: boolean
  showExpiryDate: boolean
  headerText: string
  footerText: string
}

export const DEFAULT_ID_CARD_TEMPLATE: IdCardTemplate = {
  layout: 'classic',
  orientation: 'portrait',
  primaryColor: '#081a33',
  accentColor: '#0094e0',
  showLogo: true,
  showQr: true,
  showSia: true,
  showIssueDate: true,
  showExpiryDate: true,
  footerText: 'Verified Digital Identity',
  headerText: 'Digital Staff ID',
}

export function cleanIdCardTemplate(value: unknown): IdCardTemplate {
  const template = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}

  return {
    ...DEFAULT_ID_CARD_TEMPLATE,
    ...template,
    layout: typeof template.layout === 'string' && ['classic', 'compact', 'bold'].includes(template.layout)
      ? template.layout as IdCardTemplate['layout']
      : DEFAULT_ID_CARD_TEMPLATE.layout,
    orientation: typeof template.orientation === 'string' && ['portrait', 'landscape'].includes(template.orientation)
      ? template.orientation as IdCardTemplate['orientation']
      : DEFAULT_ID_CARD_TEMPLATE.orientation,
    primaryColor: typeof template.primaryColor === 'string'
      ? template.primaryColor
      : DEFAULT_ID_CARD_TEMPLATE.primaryColor,
    accentColor: typeof template.accentColor === 'string'
      ? template.accentColor
      : DEFAULT_ID_CARD_TEMPLATE.accentColor,
    showLogo: typeof template.showLogo === 'boolean'
      ? template.showLogo
      : DEFAULT_ID_CARD_TEMPLATE.showLogo,
    showQr: typeof template.showQr === 'boolean'
      ? template.showQr
      : DEFAULT_ID_CARD_TEMPLATE.showQr,
    showSia: typeof template.showSia === 'boolean'
      ? template.showSia
      : DEFAULT_ID_CARD_TEMPLATE.showSia,
    showIssueDate: typeof template.showIssueDate === 'boolean'
      ? template.showIssueDate
      : DEFAULT_ID_CARD_TEMPLATE.showIssueDate,
    showExpiryDate: typeof template.showExpiryDate === 'boolean'
      ? template.showExpiryDate
      : DEFAULT_ID_CARD_TEMPLATE.showExpiryDate,
    headerText: typeof template.headerText === 'string'
      ? template.headerText.slice(0, 60)
      : DEFAULT_ID_CARD_TEMPLATE.headerText,
    footerText: typeof template.footerText === 'string'
      ? template.footerText.slice(0, 80)
      : DEFAULT_ID_CARD_TEMPLATE.footerText,
  }
}
