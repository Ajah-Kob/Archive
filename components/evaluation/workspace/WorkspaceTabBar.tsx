'use client'

import { Plus, X } from 'lucide-react'

/**
 * A single open document version tab.
 *
 * `id` is the document id from the headless DocumentManagerPluginPackage —
 * the same value passed to `setActiveDocument` / `closeDocument`.
 * `isCurrent` marks the latest submitted version: it renders a "current"
 * pill and is the default active tab when the workspace opens.
 */
export interface WorkspaceTab {
  id: string
  label: string
  isCurrent: boolean
}

interface WorkspaceTabBarProps {
  /** Open document versions, in display order (newest first). */
  tabs: WorkspaceTab[]
  /**
   * The currently selected document id. Wire this to the document-manager
   * capability's `getActiveDocumentId()` (or `useActiveDocument`) in the
   * parent orchestrator so the highlight follows the EmbedPDF state.
   */
  activeTabId: string | null
  /**
   * Called when a tab is clicked. Wire this to the document-manager
   * capability's `setActiveDocument(id)` in the parent orchestrator.
   */
  onSelectTab: (id: string) => void
  /**
   * Called when a tab's close (X) button is clicked. Wire this to the
   * document-manager capability's `closeDocument(id)` in the parent
   * orchestrator. The parent decides whether the tab may be closed (e.g.
   * guarding the last open tab).
   */
  onCloseTab: (id: string) => void
  /** Called when the + button is clicked — opens the Versions drawer. */
  onOpenVersions: () => void
}

const TAB_BASE =
  'group flex items-center gap-[6px] h-[34px] max-w-[220px] pl-[12px] pr-[6px] rounded-t-[5px] border transition-colors shrink-0'
const TAB_ACTIVE =
  'bg-white border-[#eceef8] border-b-0 shadow-[inset_0_2px_0_0_#707dff]'
const TAB_IDLE = 'bg-[#fafbff] border-[#eceef8] hover:bg-white'

const LABEL_ACTIVE = 'font-bold text-[#1e2145]'
const LABEL_IDLE = 'font-semibold text-[#8a93b4] group-hover:text-[#5a6382]'

/**
 * Browser-style version tab bar for the adviser document workspace.
 *
 * Renders one tab per open document version. The current version is the
 * default active tab — the parent should initialize `activeTabId` to the
 * `isCurrent` tab's id. The active tab is highlighted with an indigo top
 * accent and a white body that connects to the content below; every tab is
 * closable via its X button; the trailing + button opens the Versions drawer.
 *
 * The component is presentational: tab switching and closing are delegated
 * through `onSelectTab` / `onCloseTab` so the parent orchestrator can drive
 * the DocumentManagerPluginPackage (`setActiveDocument` / `closeDocument`),
 * mirroring how `VersionDrawer` delegates `onOpenVersion` → `addDocument`.
 */
export function WorkspaceTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenVersions,
}: WorkspaceTabBarProps) {
  return (
    <div className="bg-[#f4f5fc] border-b border-[#eceef8]">
      <div
        role="tablist"
        aria-label="Open document versions"
        className="flex items-end gap-[3px] px-[10px] pt-[8px] overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_IDLE}`}
            >
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                title={tab.label}
                className="flex items-center gap-[6px] min-w-0 flex-1 rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-[#707dff]"
              >
                <span
                  className={`truncate font-sans text-[12px] leading-[18px] ${
                    isActive ? LABEL_ACTIVE : LABEL_IDLE
                  }`}
                >
                  {tab.label}
                </span>
                {tab.isCurrent && (
                  <span className="shrink-0 bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[6px] py-[1px] font-sans font-bold text-[9px] leading-[13px] text-[#707dff]">
                    current
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onCloseTab(tab.id)}
                aria-label={`Close ${tab.label}`}
                title={`Close ${tab.label}`}
                className="flex items-center justify-center size-[18px] rounded-[5px] text-[#9ea8c6] hover:bg-[#f4f5fc] hover:text-[#5a6382] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#707dff] shrink-0"
              >
                <X className="size-[11px]" strokeWidth={2.25} />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          onClick={onOpenVersions}
          aria-label="Open versions"
          title="Open versions"
          className="flex items-center justify-center size-[30px] mb-[2px] rounded-[8px] bg-white border border-[#e8ebf8] text-[#707dff] hover:bg-[#f4f6ff] hover:border-[#e5e8ff] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#707dff] shrink-0"
        >
          <Plus className="size-[14px]" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}