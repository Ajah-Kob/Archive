export type OverlayToken = symbol
export type ScrollLockToken = symbol

export interface BodyStyleTarget {
  style: {
    overflow: string
  }
}

export interface OverlayRegistry {
  register: () => OverlayToken
  unregister: (token: OverlayToken) => boolean
  top: () => OverlayToken | null
  has: (token: OverlayToken) => boolean
  size: () => number
  entries: () => readonly OverlayToken[]
}

export interface ScrollLock {
  acquire: (target?: BodyStyleTarget | null) => ScrollLockToken
  release: (token: ScrollLockToken) => boolean
  count: () => number
  countFor: (target: BodyStyleTarget | null) => number
}

interface ScrollLockState {
  count: number
  previousOverflow: string
}

/** Creates an isolated registry for tests or non-module-level consumers. */
export function createOverlayRegistry(): OverlayRegistry {
  const tokens: OverlayToken[] = []

  return {
    register() {
      const token = Symbol('drawer-overlay')
      tokens.push(token)
      return token
    },
    unregister(token) {
      const index = tokens.indexOf(token)
      if (index === -1) return false

      tokens.splice(index, 1)
      return true
    },
    top() {
      return tokens[tokens.length - 1] ?? null
    },
    has(token) {
      return tokens.indexOf(token) !== -1
    },
    size() {
      return tokens.length
    },
    entries() {
      return tokens.slice()
    },
  }
}

/** Creates an isolated, DOM-free ref-counted lock controller. */
export function createScrollLock(
  defaultTarget: BodyStyleTarget | null = null,
): ScrollLock {
  const states = new Map<BodyStyleTarget | null, ScrollLockState>()
  const tokenTargets = new Map<ScrollLockToken, BodyStyleTarget | null>()

  return {
    acquire(target = defaultTarget) {
      const existingState = states.get(target)

      if (existingState) {
        existingState.count += 1
      } else {
        const previousOverflow = target ? target.style.overflow : ''
        states.set(target, { count: 1, previousOverflow })
        if (target) target.style.overflow = 'hidden'
      }

      const token = Symbol('drawer-scroll-lock')
      tokenTargets.set(token, target)
      return token
    },
    release(token) {
      if (!tokenTargets.has(token)) return false

      const target = tokenTargets.get(token) ?? null
      tokenTargets.delete(token)

      const state = states.get(target)
      if (!state) return false

      state.count -= 1
      if (state.count > 0) return true

      if (target) target.style.overflow = state.previousOverflow
      states.delete(target)
      return true
    },
    count() {
      return tokenTargets.size
    },
    countFor(target) {
      return states.get(target)?.count ?? 0
    },
  }
}

function getDefaultBodyStyleTarget(): BodyStyleTarget | null {
  if (typeof globalThis.document === 'undefined') return null
  return globalThis.document.body
}

export const overlayRegistry = createOverlayRegistry()
export const scrollLock = createScrollLock()

const overlayLockTokens = new Map<OverlayToken, ScrollLockToken>()

/** Registers a live overlay and acquires its associated scroll lock. */
export function registerOverlay(
  styleTarget?: BodyStyleTarget | null,
): OverlayToken {
  const token = overlayRegistry.register()
  const target =
    styleTarget === undefined ? getDefaultBodyStyleTarget() : styleTarget
  const lockToken = scrollLock.acquire(target)
  overlayLockTokens.set(token, lockToken)
  return token
}

export function unregisterOverlay(token: OverlayToken): boolean {
  const removed = overlayRegistry.unregister(token)
  const lockToken = overlayLockTokens.get(token)
  if (lockToken !== undefined) {
    scrollLock.release(lockToken)
    overlayLockTokens.delete(token)
  }
  return removed
}

export function getTopOverlay(): OverlayToken | null {
  return overlayRegistry.top()
}

export function getTopmostOverlay(): OverlayToken | null {
  return getTopOverlay()
}

export function hasOverlay(token: OverlayToken): boolean {
  return overlayRegistry.has(token)
}

export function getOverlayStack(): readonly OverlayToken[] {
  return overlayRegistry.entries()
}

export function getOverlayCount(): number {
  return overlayRegistry.size()
}

export function acquireScrollLock(
  target?: BodyStyleTarget | null,
): ScrollLockToken {
  return scrollLock.acquire(
    target === undefined ? getDefaultBodyStyleTarget() : target,
  )
}

export function releaseScrollLock(token: ScrollLockToken): boolean {
  return scrollLock.release(token)
}

export function getScrollLockCount(): number {
  return scrollLock.count()
}

export function getScrollLockCountFor(target: BodyStyleTarget | null): number {
  return scrollLock.countFor(target)
}

export const acquireBodyScrollLock = acquireScrollLock
export const releaseBodyScrollLock = releaseScrollLock
export const lockBodyScroll = acquireScrollLock
export const unlockBodyScroll = releaseScrollLock
