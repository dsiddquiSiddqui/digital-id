import { LoadingState } from '@/components/portal/PortalUi'

export default function PortalLoading() {
  return <div className="space-y-6" aria-busy="true" aria-label="Loading portal page"><div className="h-24 animate-pulse rounded-[24px] bg-white/70" /><LoadingState /><div className="h-80 animate-pulse rounded-[24px] bg-white/70" /></div>
}
