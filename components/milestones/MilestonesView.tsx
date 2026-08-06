'use client'

import type { WorkspaceData } from '@/types/milestones'
import { EmptyGroupState } from '@/components/milestones/EmptyGroupState'
import { GroupDashboard } from '@/components/milestones/GroupDashboard'

export function MilestonesView({ data }: { data: WorkspaceData }) {
  return data.group ? <GroupDashboard data={data} /> : <EmptyGroupState />
}
