import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  children: ReactNode
  sidebarItems: Array<{ label: string; icon: string; path: string; badge?: number }>
}

export function AppLayout({ children, sidebarItems }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar items={sidebarItems} />
      <main className="flex-1 overflow-y-auto bg-bg p-8">{children}</main>
    </div>
  )
}
