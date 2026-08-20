import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, type LucideIcon } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="dx-page-header">
      <div className="min-w-0">
        <p className="dx-eyebrow">{eyebrow}</p>
        <h1 className="dx-page-title">{title}</h1>
        <p className="dx-page-description">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function PrimaryAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="dx-button dx-button-primary">
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

export function SecondaryAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="dx-button dx-button-secondary">
      {children}
    </Link>
  )
}

export function Surface({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`dx-surface ${className}`}>{children}</section>
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-black tracking-[-0.02em] text-[var(--dx-ink)]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--dx-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  href,
  detail,
  signal = false,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  href?: string
  detail?: string
  signal?: boolean
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--dx-muted)]">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${signal ? 'bg-[var(--dx-signal)] text-[var(--dx-ink)]' : 'bg-[var(--dx-canvas)] text-[var(--dx-muted-strong)]'}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-4xl font-black tracking-[-0.06em] text-[var(--dx-ink)]">{value}</p>
      {detail ? <p className="mt-2 text-xs font-semibold text-[var(--dx-muted)]">{detail}</p> : null}
    </>
  )

  if (href) {
    return <Link href={href} className="dx-metric group">{content}</Link>
  }

  return <div className="dx-metric">{content}</div>
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className={`dx-status dx-status-${tone}`}>{children}</span>
}
