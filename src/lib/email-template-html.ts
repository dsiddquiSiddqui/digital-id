import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3',
  'hr', 'i', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody',
  'td', 'th', 'thead', 'tr', 'u', 'ul',
]

export function sanitizeEmailTemplateHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      '*': ['class', 'style'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z]+$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb\(/i, /^[a-z]+$/i],
        'font-size': [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
        'font-weight': [/^(?:normal|bold|[1-9]00)$/],
        'text-align': [/^(?:left|right|center|justify)$/],
      },
    },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, rel: 'noopener noreferrer' },
      }),
    },
    disallowedTagsMode: 'discard',
  })
}
