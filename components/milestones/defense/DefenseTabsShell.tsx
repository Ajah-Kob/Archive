'use client'

interface DefenseTabsShellProps {
  children: React.ReactNode
  defenseType?: 'PROPOSAL' | 'FINAL'
}

export function DefenseTabsShell({ children }: DefenseTabsShellProps) {
  return <>{children}</>
}
