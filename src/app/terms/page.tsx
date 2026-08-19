export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf8] px-6 py-12 text-slate-950">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Terms of Service</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
          <p>Security ID is provided for organizations that manage staff identity, document, and verification workflows.</p>
          <p>Workspace admins are responsible for user access, staff data accuracy, document retention, and lawful processing of personal data.</p>
          <p>Do not upload unlawful, malicious, or unrelated files. Access may be suspended for abuse, failed payment, or security risk.</p>
          <p>Production customers should review these terms with legal counsel and replace this template with company-approved wording.</p>
        </div>
      </article>
    </main>
  )
}
