'use client'

import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  getForwardFocusTarget,
  getInitialFocusTarget,
  getReverseFocusTarget,
  orderFocusCandidates,
  type FocusCandidate,
} from './drawer-focus'
import {
  getTopmostOverlay,
  registerOverlay,
  unregisterOverlay,
  type OverlayToken,
} from './drawer-overlay'

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  size?: DrawerSize
}

export interface DrawerHeaderProps {
  title: string
  subtitle: string
}

export interface DrawerBodyProps {
  children: ReactNode
}

export interface DrawerFooterProps {
  children?: ReactNode
}

/**
 * Drawer migration contract:
 * - Use the preset-first widths (`sm`/`md`/`lg`/`xl`) by default. Keep
 *   `max-w-full`; reserve `className` for a measured exception such as
 *   `w-full! sm:w-[420px]!`, not a new shared size-map entry.
 * - Feature wrappers forward the shared controlled API and leave the portal
 *   mounted while closed: do not use `open && <Drawer />`, conditionally mount
 *   the portal, add a second dialog layer, or add header boolean/custom-content
 *   modes. `Drawer.Header` accepts only required string `title` and `subtitle`.
 * - Generic visible action text is allowed only when surrounding content makes
 *   the target unique. Repeated or icon-only migrated actions use an
 *   entity-specific accessible name, such as `Open version 2 of file.pdf` or
 *   `View chapter document file.pdf`.
 */
const DRAWER_SIZE_CLASSES: Record<DrawerSize, string> = {
  sm: 'w-[480px]',
  md: 'w-[600px]',
  lg: 'w-[800px]',
  xl: 'w-[1000px]',
}

const subscribeToMountState = () => () => {}
const getClientMountSnapshot = () => true
const getServerMountSnapshot = () => false

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const HIGHER_Z_CLASS_PATTERN =
  /(?:^|\s)z-(?:\[(?:6\d|[7-9]\d|[1-9]\d{2,})\]|(?:6\d|[7-9]\d|[1-9]\d{2,}))(?:\s|$)/

function isDisabled(element: HTMLElement) {
  if (element.hasAttribute('disabled')) return true
  if (element.getAttribute('aria-disabled')?.trim().toLowerCase() === 'true') return true
  return element.matches(':disabled')
}

function isVisible(element: HTMLElement) {
  let current: Element | null = element

  while (current) {
    if (
      current.hasAttribute('hidden') ||
      current.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true' ||
      current.hasAttribute('inert')
    ) {
      return false
    }

    const style = window.getComputedStyle(current)
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      style.opacity === '0' ||
      style.getPropertyValue('content-visibility') === 'hidden'
    ) {
      return false
    }

    if (
      current === element &&
      (style.width === '0px' || style.height === '0px')
    ) {
      return false
    }
    current = current.parentElement
  }

  return true
}

function isTabbable(element: HTMLElement) {
  if (element.hasAttribute('tabindex')) return element.tabIndex >= 0

  const contentEditable = element.getAttribute('contenteditable')
  return (
    element.tabIndex >= 0 ||
    (contentEditable != null && contentEditable.trim().toLowerCase() !== 'false')
  )
}

function getElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target
  if (target instanceof Node) return target.parentElement
  return null
}

function isModalElement(element: Element) {
  const role = element.getAttribute('role')?.trim().toLowerCase()
  return (
    role === 'dialog' ||
    role === 'alertdialog' ||
    element.getAttribute('aria-modal')?.trim().toLowerCase() === 'true'
  )
}

function hasHigherLayer(element: Element) {
  if (typeof window === 'undefined') return false

  const className = typeof element.className === 'string' ? element.className : ''
  if (HIGHER_Z_CLASS_PATTERN.test(className)) return true

  const zIndex = Number.parseInt(window.getComputedStyle(element).zIndex, 10)
  return Number.isFinite(zIndex) && zIndex >= 60
}

function isExternalHigherOverlay(
  target: EventTarget | null,
  panel: HTMLElement,
) {
  let current = getElement(target)
  if (!current) return false

  while (current) {
    if (current === panel) return false
    if (isModalElement(current) && !current.hasAttribute('data-drawer-root')) {
      return true
    }
    if (hasHigherLayer(current)) return true
    if (current.hasAttribute('data-drawer-root')) return false
    current = current.parentElement
  }

  return false
}

function isInsideAnotherOpenDrawer(
  target: EventTarget | null,
  panel: HTMLElement,
) {
  const element = getElement(target)
  if (!element) return false

  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-drawer-root][data-open="true"]'),
  ).some(
    (drawer) => drawer !== panel && drawer.contains(element),
  )
}

function getFocusCandidates(panel: HTMLElement): FocusCandidate<HTMLElement>[] {
  const elements = Array.from(
    panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )

  return orderFocusCandidates(
    elements.map((element, index) => {
      const style = window.getComputedStyle(element)
      const isRadio = element instanceof HTMLInputElement && element.type === 'radio'
      const tabbable = isTabbable(element)
      const tabIndex = element.hasAttribute('tabindex')
        ? element.tabIndex
        : tabbable
          ? Math.max(element.tabIndex, 0)
          : -1

      return {
        element,
        domOrder: index,
        tabIndex,
        disabled: isDisabled(element),
        ariaDisabled: element.getAttribute('aria-disabled'),
        hidden: element.hasAttribute('hidden'),
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.hasAttribute('inert'),
        visible: isVisible(element),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        contentVisibility: style.getPropertyValue('content-visibility'),
        width: style.width,
        height: style.height,
        isRadio,
        type: element.getAttribute('type'),
        name: element.getAttribute('name'),
        radioName: isRadio ? element.getAttribute('name') : null,
        checked: isRadio && (element as HTMLInputElement).checked,
        isClose: element.dataset.drawerClose === 'true',
        dataDrawerClose: element.dataset.drawerClose,
        id: element.id,
      }
    }),
  )
}

function focusElement(element: Element | null | undefined) {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    element.focus()
  }
}

function trapFocus(panel: HTMLElement, event: KeyboardEvent) {
  const candidates = getFocusCandidates(panel)
  const firstCandidate = candidates[0]
  const lastCandidate = candidates[candidates.length - 1]

  if (!firstCandidate || !lastCandidate) {
    event.preventDefault()
    panel.focus()
    return
  }

  const activeElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  const eventElement = getElement(event.target)
  const current =
    activeElement && panel.contains(activeElement)
      ? activeElement
      : eventElement instanceof HTMLElement && panel.contains(eventElement)
        ? eventElement
        : undefined
  const nextCandidate = event.shiftKey
    ? getReverseFocusTarget(candidates, current)
    : getForwardFocusTarget(candidates, current)

  if (!nextCandidate) {
    event.preventDefault()
    panel.focus()
    return
  }

  event.preventDefault()
  focusElement(nextCandidate.element)
}

type DrawerContextValue = {
  onClose: () => void
  titleId: string
  subtitleId: string
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

function useDrawerContext(): DrawerContextValue {
  const context = use(DrawerContext)
  if (!context) {
    throw new Error('Drawer subcomponents must be rendered within Drawer')
  }
  return context
}

export function DrawerRoot({
  open,
  onClose,
  children,
  className,
  size = 'md',
}: DrawerProps): ReactElement | null {
  const mounted = useSyncExternalStore(
    subscribeToMountState,
    getClientMountSnapshot,
    getServerMountSnapshot,
  )
  const drawerId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const overlayTokenRef = useRef<OverlayToken | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!mounted || !open) return

    const panel = panelRef.current
    if (!panel) return

    const token = registerOverlay(document.body)
    overlayTokenRef.current = token
    const previousFocus = document.activeElement

    function isTopmost() {
      return getTopmostOverlay() === token
    }

    function hasExternalHigherFocus() {
      return isExternalHigherOverlay(document.activeElement, panel)
    }

    function hasHigherFocus() {
      const activeElement = document.activeElement
      return (
        hasExternalHigherFocus() ||
        isInsideAnotherOpenDrawer(activeElement, panel)
      )
    }

    function focusInitialTarget() {
      if (!isTopmost() || hasExternalHigherFocus()) return

      const initialTarget = getInitialFocusTarget(getFocusCandidates(panel))
      if (initialTarget) {
        focusElement(initialTarget.element)
        return
      }

      panel.focus()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || !isTopmost() || hasHigherFocus()) return
      if (isExternalHigherOverlay(event.target, panel)) return
      if (isInsideAnotherOpenDrawer(event.target, panel)) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      trapFocus(panel, event)
    }

    function handlePointerDown(event: PointerEvent) {
      if (!isTopmost() || hasHigherFocus()) return

      const target = getElement(event.target)
      if (!target || isExternalHigherOverlay(target, panel)) return
      if (isInsideAnotherOpenDrawer(target, panel)) return
      if (panel.contains(target)) return
      if (!backdropRef.current?.contains(target)) return

      onCloseRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    focusInitialTarget()

    return () => {
      const wasTopmost = isTopmost()

      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
      unregisterOverlay(token)
      if (overlayTokenRef.current === token) {
        overlayTokenRef.current = null
      }

      if (wasTopmost && !hasHigherFocus() && previousFocus?.isConnected) {
        focusElement(previousFocus)
      }
    }
  }, [mounted, open])

  if (!mounted) return null

  const titleId = `${drawerId}-title`
  const subtitleId = `${drawerId}-subtitle`
  const panelClassName = [
    'fixed top-0 right-0 z-50 flex h-dvh max-w-full flex-col overflow-hidden bg-white border-l border-[#eceef8] shadow-[-8px_0px_40px_rgba(112,125,255,0.14)]',
    'transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0',
    DRAWER_SIZE_CLASSES[size],
    open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <DrawerContext value={{ onClose, titleId, subtitleId }}>
      <>
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
        <div
          ref={panelRef}
          data-drawer-root=""
          data-open={open}
          data-size={size}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
          inert={!open}
          tabIndex={-1}
          aria-labelledby={titleId}
          aria-describedby={subtitleId}
          className={panelClassName}
        >
          {children}
        </div>
      </>
    </DrawerContext>,
    document.body,
  )
}

export function DrawerHeader({ title, subtitle }: DrawerHeaderProps): ReactElement {
  const { onClose, titleId, subtitleId } = useDrawerContext()

  return (
    <header className="flex shrink-0 items-start justify-between gap-[16px] border-b border-[#eceef8] px-6 py-4">
      <div className="min-w-0">
        <h2
          id={titleId}
          className="font-sora text-[17px] font-bold leading-[25.5px] tracking-[-0.17px] text-[#12143a]"
        >
          {title}
        </h2>
        <p
          id={subtitleId}
          className="pt-[4px] font-sans text-[12.5px] font-medium leading-[18.75px] text-[#8a93b4]"
        >
          {subtitle}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        data-drawer-close="true"
        aria-label="Close drawer"
        className="flex size-[28px] shrink-0 items-center justify-center rounded-[14px] border border-[#eceef8] bg-[#fafbff] text-[#8a93b4] transition-colors hover:bg-gray-50"
      >
        <X className="size-[13px]" />
      </button>
    </header>
  )
}

export function DrawerBody({ children }: DrawerBodyProps): ReactElement {
  return <div className="min-h-0 flex-1 overflow-y-auto flex flex-col">{children}</div>
}

export function DrawerFooter({ children }: DrawerFooterProps): ReactElement | null {
  if (children == null) return null

  return (
    <footer className="shrink-0 border-t border-[#f0f2fa] px-6 py-4">
      {children}
    </footer>
  )
}

export type DrawerComponent = ((props: DrawerProps) => ReactElement | null) & {
  Header: (props: DrawerHeaderProps) => ReactElement
  Body: (props: DrawerBodyProps) => ReactElement
  Footer: (props: DrawerFooterProps) => ReactElement | null
}

export const Drawer: DrawerComponent = Object.assign(DrawerRoot, {
  Header: DrawerHeader,
  Body: DrawerBody,
  Footer: DrawerFooter,
})

export default Drawer
