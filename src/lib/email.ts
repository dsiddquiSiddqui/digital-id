import { createAdminClient } from '@/lib/supabase/admin'

type EmailInput = {
  organizationId?: string | null
  profileId?: string | null
  to: string
  subject: string
  html: string
  text?: string
  templateKey: string
  metadata?: Record<string, unknown>
}

type EmailResult = {
  status: 'sent' | 'skipped' | 'failed'
  provider: string
  messageId?: string | null
  error?: string
}

const TEMPLATE_ALIASES: Record<string, string[]> = {
  user_invitation: ['user_invitation', 'invite_user'],
  expiry_reminder: ['expiry_reminder', 'document_expiry'],
  automation_rule: ['automation_rule', 'document_expiry'],
}

function defaultFromAddress() {
  return process.env.EMAIL_FROM || 'noreply@digital-id-x.local'
}

function renderTemplate(value: string, variables: Record<string, unknown>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const replacement = variables[key]
    if (replacement === null || replacement === undefined) return ''
    if (typeof replacement === 'object') return ''
    return String(replacement)
  })
}

async function resolveEmailContent(
  supabase: ReturnType<typeof createAdminClient>,
  input: EmailInput
) {
  const variables = {
    ...(input.metadata || {}),
    organization_name: input.metadata?.organization_name || input.metadata?.organizationName,
  }

  if (!input.organizationId) {
    return {
      subject: input.subject,
      html: input.html,
      text: input.text,
      templateId: null as string | null,
    }
  }

  const keys = TEMPLATE_ALIASES[input.templateKey] || [input.templateKey]
  const { data } = await supabase
    .from('email_templates')
    .select('id, subject, body_html, body_text')
    .eq('organization_id', input.organizationId)
    .eq('is_active', true)
    .in('template_key', keys)
    .limit(1)
    .maybeSingle()

  if (!data) {
    return {
      subject: input.subject,
      html: input.html,
      text: input.text,
      templateId: null as string | null,
    }
  }

  return {
    subject: renderTemplate(data.subject || input.subject, variables),
    html: renderTemplate(data.body_html || input.html, variables),
    text: data.body_text ? renderTemplate(data.body_text, variables) : input.text,
    templateId: data.id as string,
  }
}

export async function sendTransactionalEmail(input: EmailInput): Promise<EmailResult> {
  const supabase = createAdminClient()
  const provider = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'manual')
  const content = await resolveEmailContent(supabase, input).catch(() => ({
    subject: input.subject,
    html: input.html,
    text: input.text,
    templateId: null as string | null,
  }))
  let result: EmailResult = {
    status: 'skipped',
    provider,
    error: 'Email provider is not configured.',
  }

  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: defaultFromAddress(),
          to: [input.to],
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        result = {
          status: 'failed',
          provider,
          error: data?.message || 'Email provider rejected the message.',
        }
      } else {
        result = {
          status: 'sent',
          provider,
          messageId: data?.id || null,
        }
      }
    } catch (error) {
      result = {
        status: 'failed',
        provider,
        error: error instanceof Error ? error.message : 'Email send failed.',
      }
    }
  }

  await supabase.from('email_delivery_logs').insert({
    organization_id: input.organizationId || null,
    profile_id: input.profileId || null,
    template_key: input.templateKey,
    recipient_email: input.to,
    subject: content.subject,
    provider: result.provider,
    provider_message_id: result.messageId || null,
    status: result.status,
    error_message: result.error || null,
    metadata: { ...(input.metadata || {}), email_template_id: content.templateId },
  })

  return result
}
