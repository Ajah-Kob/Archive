/**
 * Pure metadata layer for drawer focus management. DOM inspection belongs in
 * the client integration; this module only consumes the resulting snapshot.
 */
export type FocusMetadataFlag = boolean | number | string | null

export interface FocusRect {
  width?: number | string
  height?: number | string
}

export interface FocusCandidate<T = unknown> {
  /** The DOM node or other value browser integration will focus. */
  element?: T
  target?: T
  value?: T
  id?: string | number

  /** Input order and tab order metadata supplied by browser integration. */
  domOrder?: number
  domIndex?: number
  order?: number
  tabIndex?: number

  /** State and visibility metadata collected by browser integration. */
  disabled?: FocusMetadataFlag
  ariaDisabled?: FocusMetadataFlag
  hidden?: FocusMetadataFlag
  ariaHidden?: FocusMetadataFlag
  inert?: FocusMetadataFlag
  visible?: FocusMetadataFlag
  isVisible?: FocusMetadataFlag
  hasLayout?: FocusMetadataFlag
  display?: string
  visibility?: string
  opacity?: number | string
  contentVisibility?: string
  width?: number | string
  height?: number | string
  rect?: FocusRect
  layout?: FocusRect

  /** Radio and initial-focus metadata. */
  isRadio?: FocusMetadataFlag
  type?: string | null
  radioGroup?: string | null
  radioName?: string | null
  name?: string | null
  checked?: FocusMetadataFlag
  isClose?: FocusMetadataFlag
  close?: FocusMetadataFlag
  closeControl?: FocusMetadataFlag
  dataDrawerClose?: FocusMetadataFlag

  [key: string]: unknown
}

export type FocusReference<T = unknown> =
  | FocusCandidate<T>
  | T
  | string
  | number
  | null
  | undefined

export type InitialFocusReference<T = unknown> =
  | FocusReference<T>
  | ((candidate: FocusCandidate<T>) => boolean)

function isTrue(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1'
}

function isFalse(value: unknown): boolean {
  if (value === false || value === 0) return true
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'false' || normalized === '0'
}

function tabIndexOf(candidate: FocusCandidate): number {
  if (typeof candidate.tabIndex !== 'number') return 0
  return Number.isFinite(candidate.tabIndex) ? candidate.tabIndex : 0
}

function isZeroDimension(value: unknown): boolean {
  if (typeof value === 'number') return value === 0
  if (typeof value !== 'string' || value.trim() === '') return false
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) && numeric === 0
}

function isRadio(candidate: FocusCandidate): boolean {
  if (isFalse(candidate.isRadio)) return false
  return (
    isTrue(candidate.isRadio) ||
    candidate.type?.trim().toLowerCase() === 'radio' ||
    candidate.radioName != null ||
    candidate.radioGroup != null
  )
}

function radioGroupOf(candidate: FocusCandidate): string | null {
  if (!isRadio(candidate)) return null
  const value = candidate.radioGroup ?? candidate.radioName ?? candidate.name
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const name = String(value)
  return name.length > 0 ? name : null
}

function isHiddenByMetadata(candidate: FocusCandidate): boolean {
  if (
    isTrue(candidate.hidden) ||
    isTrue(candidate.ariaHidden) ||
    isTrue(candidate.inert) ||
    isFalse(candidate.visible) ||
    isFalse(candidate.isVisible) ||
    isFalse(candidate.hasLayout)
  ) {
    return true
  }

  const display = candidate.display?.trim().toLowerCase()
  const visibility = candidate.visibility?.trim().toLowerCase()
  const contentVisibility = candidate.contentVisibility?.trim().toLowerCase()
  if (
    display === 'none' ||
    visibility === 'hidden' ||
    visibility === 'collapse' ||
    contentVisibility === 'hidden'
  ) {
    return true
  }

  if (isZeroDimension(candidate.opacity)) return true

  const width =
    candidate.width ?? candidate.rect?.width ?? candidate.layout?.width
  const height =
    candidate.height ?? candidate.rect?.height ?? candidate.layout?.height
  return isZeroDimension(width) || isZeroDimension(height)
}

export function isEligibleFocusCandidate(candidate: FocusCandidate): boolean {
  return (
    !isTrue(candidate.disabled) &&
    !isTrue(candidate.ariaDisabled) &&
    !isHiddenByMetadata(candidate) &&
    tabIndexOf(candidate) >= 0
  )
}

export function filterFocusCandidates<T>(
  candidates: readonly FocusCandidate<T>[],
): FocusCandidate<T>[] {
  const eligible = candidates.filter((candidate) =>
    isEligibleFocusCandidate(candidate),
  )
  const radioCandidates = new Map<string, FocusCandidate<T>>()

  for (const candidate of eligible) {
    const group = radioGroupOf(candidate)
    if (group == null) continue

    const current = radioCandidates.get(group)
    if (
      current == null ||
      (isTrue(candidate.checked) && !isTrue(current.checked))
    ) {
      radioCandidates.set(group, candidate)
    }
  }

  return eligible.filter((candidate) => {
    const group = radioGroupOf(candidate)
    return group == null || radioCandidates.get(group) === candidate
  })
}

function orderOf(candidate: FocusCandidate, fallback: number): number {
  const value = candidate.domOrder ?? candidate.domIndex ?? candidate.order
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function orderFocusCandidates<T>(
  candidates: readonly FocusCandidate<T>[],
): FocusCandidate<T>[] {
  return filterFocusCandidates(candidates)
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const leftTabIndex = tabIndexOf(left.candidate)
      const rightTabIndex = tabIndexOf(right.candidate)

      if (leftTabIndex > 0 && rightTabIndex > 0) {
        const tabIndexDifference = leftTabIndex - rightTabIndex
        if (tabIndexDifference !== 0) return tabIndexDifference
      } else if (leftTabIndex > 0) {
        return -1
      } else if (rightTabIndex > 0) {
        return 1
      }

      const orderDifference =
        orderOf(left.candidate, left.index) -
        orderOf(right.candidate, right.index)
      return orderDifference || left.index - right.index
    })
    .map(({ candidate }) => candidate)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFocusSelector<T>(
  value: InitialFocusReference<T>,
): value is (candidate: FocusCandidate<T>) => boolean {
  return typeof value === 'function'
}

function candidateTarget(candidate: FocusCandidate): unknown {
  return candidate.element ?? candidate.target ?? candidate.value
}

function matchesReference(
  candidate: FocusCandidate,
  reference: unknown,
): boolean {
  if (reference == null) return false
  if (candidate === reference) return true

  const target = candidateTarget(candidate)
  if (target === reference) return true

  if (typeof reference === 'string' || typeof reference === 'number') {
    return candidate.id === reference || target === reference
  }

  if (!isRecord(reference)) return false
  const referenceTarget =
    reference.element ?? reference.target ?? reference.value
  if (referenceTarget !== undefined && target === referenceTarget) return true

  return reference.id !== undefined && candidate.id === reference.id
}

function findCandidateIndex<T>(
  candidates: readonly FocusCandidate<T>[],
  current: FocusReference<T>,
): number {
  if (current == null) return -1
  return candidates.findIndex((candidate) =>
    matchesReference(candidate, current),
  )
}

function traverse<T>(
  candidates: readonly FocusCandidate<T>[],
  current: FocusReference<T>,
  direction: 1 | -1,
): FocusCandidate<T> | null {
  const ordered = orderFocusCandidates(candidates)
  if (ordered.length === 0) return null

  const currentIndex = findCandidateIndex(ordered, current)
  if (currentIndex === -1) {
    return direction === 1 ? ordered[0] : ordered[ordered.length - 1]
  }

  const nextIndex =
    (currentIndex + direction + ordered.length) % ordered.length
  return ordered[nextIndex]
}

export function getForwardFocusTarget<T>(
  candidates: readonly FocusCandidate<T>[],
  current?: FocusReference<T>,
): FocusCandidate<T> | null {
  return traverse(candidates, current, 1)
}

export function getReverseFocusTarget<T>(
  candidates: readonly FocusCandidate<T>[],
  current?: FocusReference<T>,
): FocusCandidate<T> | null {
  return traverse(candidates, current, -1)
}

export function getInitialFocusTarget<T>(
  candidates: readonly FocusCandidate<T>[],
  closeTarget?: InitialFocusReference<T>,
): FocusCandidate<T> | null {
  const ordered = orderFocusCandidates(candidates)
  if (ordered.length === 0) return null

  const close = ordered.find((candidate) => {
    if (closeTarget == null) {
      return (
        isTrue(candidate.isClose) ||
        isTrue(candidate.close) ||
        isTrue(candidate.closeControl) ||
        isTrue(candidate.dataDrawerClose)
      )
    }
    if (isFocusSelector(closeTarget)) return closeTarget(candidate)
    return matchesReference(candidate, closeTarget)
  })

  return close ?? ordered[0]
}

export const getFocusCandidates = orderFocusCandidates
export const getFocusableCandidates = orderFocusCandidates
export const getNextFocusTarget = getForwardFocusTarget
export const getPreviousFocusTarget = getReverseFocusTarget
