export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf8] px-6 py-12 text-slate-950">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Cookie Policy</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-600">
          <p>The app uses essential cookies and local storage for authentication, workspace sessions, security settings, and legal consent.</p>
          <p>Analytics or marketing cookies should remain disabled unless you add a consent manager and disclose each provider.</p>
          <p>Admins should document retention policies for audit logs, sessions, and uploaded identity files.</p>
        </div>
      </article>
    </main>
  )
}
