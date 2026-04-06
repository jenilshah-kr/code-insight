import { PageHeader } from '@/common/components/layout/page-header'
import { DashboardClient } from '@/modules/dashboard/components/dashboard-client'

export default function OverviewPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="claude-code-analytics"
        subtitle="real-time monitoring dashboard"
      />
      <DashboardClient />
    </div>
  )
}
