# EmbedPDF: Mobile & Touch Documentation Reference

Everything EmbedPDF documents about touch, and what it means for our PDF review
workspaces. Compiled from the official docs site and verified against the npm
registry.

- **Docs:** https://www.embedpdf.com/docs
- **Our version:** `@embedpdf/core` / `@embedpdf/engines` `2.15.x`
- **Verified:** 2026-10-06. Doc pages were last updated 2026-08-03.
- **Scope:** React headless plugins — this is what our workspaces use, not the
  `@embedpdf/react-pdf-viewer` / snippet wrappers.

> There is no dedicated "mobile" page in EmbedPDF's docs. Mobile support is
> distributed across the Pan, Zoom and Selection plugins plus the interaction
> manager's pointer providers. That is why this file exists.

## Current status: the review workspace is desktop-only

The document review workspace refuses to load on touch-primary devices and shows
a notice instead — see `components/workspace/MobileUnsupported.tsx` and the
`useIsCoarsePointer()` guard in both workspace components.

This was a decision to stop, not an unfinished job. It took several attempts to
make pan, highlight and annotation placement agree with each other on a phone,
and they did not converge. The blocker is structural rather than a missing flag:
EmbedPDF's annotation layers set `touch-action: none`, so the app must own
gesture arbitration between pan, text selection and annotation placement — work
the plugins are supposed to own. See §8.

**So read this file as a reference, not a to-do list.** The upstream capability
is real and mostly excellent; we are simply not using it on touch. Sections 1–5
describe what is available if that decision is ever revisited. Section 6 records
what we tried and why it was removed. Section 7 is deferred, not recommended.

---

## 1. The two things that make touch work at all

Both come from `@embedpdf/plugin-interaction-manager`, and both are components
rather than config.

### `PagePointerProvider` — required per page

Every interactive layer must be a child of it, or it receives no pointer events:

```tsx
<Scroller
  documentId={activeDocumentId}
  renderPage={({ pageIndex }) => (
    <PagePointerProvider documentId={activeDocumentId} pageIndex={pageIndex}>
      <RenderLayer documentId={activeDocumentId} pageIndex={pageIndex} />
      <SelectionLayer documentId={activeDocumentId} pageIndex={pageIndex} />
      <AnnotationLayer documentId={activeDocumentId} pageIndex={pageIndex} />
    </PagePointerProvider>
  )}
/>
```

Applies to `SelectionLayer`, `AnnotationLayer` and `MarqueeZoom`.

**Our status:** used — 13 references across the evaluation and defense
workspaces. Correctly done.

### `GlobalPointerProvider` — required for good panning

The Pan plugin docs are emphatic about this:

> For a smooth panning experience, it's crucial that the viewer can track mouse
> movements even when the cursor moves outside the boundaries of the viewport.
> The `GlobalPointerProvider` component … solves this by capturing events
> globally.

```tsx
import { GlobalPointerProvider } from '@embedpdf/plugin-interaction-manager/react'

<GlobalPointerProvider documentId={activeDocumentId}>
  <Viewport documentId={activeDocumentId}>
    <Scroller documentId={activeDocumentId}>{/* ... */}</Scroller>
  </Viewport>
</GlobalPointerProvider>
```

This matters most on touch, where a finger routinely drifts outside the viewer
mid-drag and the drag would otherwise die.

**Our status: in use.** Added when touch was abandoned; it is what makes the
desktop Hand tool track a drag that leaves the viewer.

---

## 2. Pan plugin — touch panning, solved upstream

`@embedpdf/plugin-pan` is a hand tool built specifically for drag-to-scroll, and
the docs describe it as "especially on touch devices".

### Install

```bash
npm install @embedpdf/plugin-pan @embedpdf/plugin-viewport @embedpdf/plugin-interaction-manager
```

All three are required. `plugin-viewport` and `plugin-interaction-manager` are
already in our `package.json`; only `@embedpdf/plugin-pan` is new.

### Register — dependencies first

```tsx
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport/react'
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager/react'
import { PanPluginPackage } from '@embedpdf/plugin-pan/react'

const plugins = [
  createPluginRegistration(DocumentManagerPluginPackage, { /* ... */ }),
  createPluginRegistration(RenderPluginPackage),
  // dependencies first
  createPluginRegistration(ViewportPluginPackage),
  createPluginRegistration(InteractionManagerPluginPackage),
  createPluginRegistration(PanPluginPackage, {
    defaultMode: 'mobile',
  }),
]
```

### `defaultMode` — the mobile switch

| Value       | Behaviour                                                |
| ----------- | -------------------------------------------------------- |
| `'mobile'`  | **Default.** Pan is the default mode on touch devices only. Desktop starts in text selection. |
| `'always'`  | Pan is always default.                                    |
| `'never'`   | Never default; another mode (e.g. text selection) wins.   |

`'mobile'` is exactly the behaviour the workspaces want by default.

### API

```tsx
const { provides: pan, isPanning } = usePan(documentId)

pan?.togglePan()
pan?.enablePan()
pan?.disablePan()
pan?.makePanDefault()   // for the rest of the viewer session
pan?.isPanMode()

// reactivity, for toolbar state
pan?.onPanModeChange((isPanMode) => setToolState(isPanMode ? 'hand' : 'cursor'))
// global variant: onPanModeChange(({ documentId, isPanMode }) => ...)
```

**Our status: installed and registered** with `defaultMode: 'mobile'` in both
workspaces, replacing the hand-rolled pan described in §6. It fixed touch panning
and now backs the desktop Hand tool.

---

## 3. Zoom plugin — pinch-to-zoom

`@embedpdf/plugin-zoom` provides `<ZoomGestureWrapper />`, which enables
**pinch-to-zoom on touch** and ctrl/cmd+wheel on desktop.

```tsx
import { Scroller } from '@embedpdf/plugin-scroll/react'
import { ZoomGestureWrapper } from '@embedpdf/plugin-zoom/react'

<Viewport documentId={activeDocumentId}>
  <ZoomGestureWrapper documentId={activeDocumentId} enablePinch enableWheel>
    <Scroller documentId={activeDocumentId} renderPage={/* ... */} />
  </ZoomGestureWrapper>
</Viewport>
```

`enablePinch` and `enableWheel` both default to `true`.

### Config

| Option             | Type                 | Default             |
| ------------------ | -------------------- | ------------------- |
| `defaultZoomLevel` | `ZoomMode \| number` | `ZoomMode.Automatic`|
| `minZoom`          | `number`             | `0.2`               |
| `maxZoom`          | `number`             | `60`                |
| `presets`          | `ZoomPreset[]`       | —                   |

`ZoomMode` includes `Automatic`, `FitPage`, `FitWidth`. Read back via
`useZoom(documentId).state` (`currentZoomLevel`, `zoomLevel`,
`isMarqueeZoomActive`).

Also in this plugin: `<MarqueeZoom />` (drag a box to zoom into an area), also
requiring `PagePointerProvider`.

**Our status: not installed.** `ZoomControl.tsx` is a custom stepper driving the
render plugin's scale directly, so **we have no pinch-to-zoom**. Desktop users
use the `+`/`-` buttons. Pinch-to-zoom only matters on touch, so this is dormant
while the workspace is blocked there — but it would also be the fix for a
touch-enabled laptop or a tablet with a trackpad, which the guard does allow.

---

## 4. Selection plugin — the documented fix for accidental selection

We already register this one (`toleranceFactor: 0`). The mobile-relevant option
we are missing:

| Option                     | Type     | Default | Notes                                                        |
| -------------------------- | -------- | ------- | ------------------------------------------------------------ |
| `minSelectionDragDistance` | `number` | `3`     | Minimum drag (in **page-coordinate units**) before a drag-selection starts. **Prevents accidental selection on simple clicks.** |
| `toleranceFactor`          | `number` | `1.5`   | Hit-test tolerance × average glyph height. `0` requires exact hits. |
| `menuHeight`               | `number` | `40`    | Used to decide whether the selection menu goes above or below. |
| `maxCachedGeometries`      | `number` | `50`    | Pages of geometry kept in memory per document.               |

`minSelectionDragDistance` is the upstream answer to "a tap must not create an
annotation". Our workspace has been solving that with a hand-rolled long-press
gate instead.

### Selection menu

```tsx
<SelectionLayer
  documentId={activeDocumentId}
  pageIndex={pageIndex}
  background="rgba(33,150,243)"
  selectionMenu={(props) => <TextSelectionMenu {...props} documentId={activeDocumentId} />}
/>
```

`menuWrapperProps` **must** be spread onto your wrapper element — it carries the
positioning relative to page rotation.

### Scope API

```tsx
const { provides: selectionCapability } = useSelectionCapability()
const scope = selectionCapability?.forDocument(activeDocumentId)

scope?.copyToClipboard()
scope?.clear()
await scope?.getSelectedText()          // Task<string[]>
scope?.getFormattedSelection()          // rects per page
scope?.onSelectionChange((sel) => {})   // created / updated / cleared
scope?.onEndSelection(() => {})         // finished, i.e. on release
```

---

## 5. Annotation plugin — tools and flags

Already registered. Mobile-relevant parts:

### Tool ids

Pass one to `setActiveTool(id)`, or `null` to deactivate.

`highlight` · `underline` · `strikeout` · `squiggly` · `ink` ·
`inkHighlighter` · `circle` · `square` · `line` · `lineArrow` · `polyline` ·
`polygon` · `freeText` · `stamp`

### Config

| Option                      | Type              | Default    |
| --------------------------- | ----------------- | ---------- |
| `annotationAuthor`          | `string`          | `'Guest'`  |
| `autoCommit`                | `boolean`         | `true`     |
| `tools`                     | `AnnotationTool[]`| —          |
| `colorPresets`              | `string[]`        | —          |
| `deactivateToolAfterCreate` | `boolean`         | `false`    |
| `selectAfterCreate`         | `boolean`         | `true`     |

`deactivateToolAfterCreate: true` is the one to know on mobile — it stops a
tool staying armed after one annotation, so the next tap cannot create another
by reflex.

### Annotation flags — a cleaner read-only mode

Every annotation carries a spec-defined flag array, readable as
`annotation.flags: PdfAnnotationFlagName[]`. This is a better foundation for our
student view-only mode than hiding toolbar buttons.

| Flag              | Render | Select | Move/Resize | Edit content |
| ----------------- | ------ | ------ | ----------- | ------------ |
| `hidden`          | no     | no     | no          | no           |
| `noView`          | no     | no     | no          | no (prints)  |
| `readOnly`        | yes    | no     | no          | no           |
| `locked`          | yes    | yes    | no          | yes          |
| `lockedContents`  | yes    | yes    | yes         | no           |

```tsx
const annotation = annotationApi?.getAnnotationById(id)?.object
const isLocked = annotation?.flags?.includes('locked') ?? false

annotationApi?.updateAnnotation(pageIndex, id, {
  flags: next,
})
```

Selection menus also receive `structurallyLocked` and `contentLocked` on
`context`.

### Lifecycle events

```tsx
const unsubscribe = annotationApi?.onAnnotationEvent((event) => {
  if (event.type === 'create' && event.committed) { /* saved to engine */ }
})
```

`create` / `update` / `delete` / `loaded`. `committed: true` means written to the
PDF document in the engine. This is what our draft auto-save listens for.

---

## 6. What was tried on touch, and why it was removed

Historical record. None of this code exists any more — it is here so nobody
re-derives it from scratch if mobile is revisited.

### Attempt 1 — hand-rolled panning

`lib/pdf/viewer-pan.ts` computed clamped pan offsets and the workspaces wrote
`scrollLeft`/`scrollTop` directly. The plugin reads the same properties off the
viewport, so targeting the right element was never the problem.

It failed because the gesture was contested. The gate overlay declared
`touch-action: pan-x pan-y`, so Chrome treated a flick as a *native* pan and
fired `touchcancel`, killing the JS pan — while the overlay sat outside the
scrollable element, so the native pan had nowhere to go. Nothing moved.

Deeper cause: `panMode` state sat beside `activeTool`, and both claimed the same
gesture. Two owners, one gesture.

### Attempt 2 — the Pan plugin

`@embedpdf/plugin-pan` with `defaultMode: 'mobile'` plus `GlobalPointerProvider`.
This is the correct upstream answer and it is what remains in the codebase,
because it also backs the desktop Hand tool.

It fixed pan. It did not fix highlight, and chasing that is what cost us.

### Attempt 3 — long-press gate

To stop a tap creating an annotation, a `LongPressGate` overlay swallowed the
touch, and after a 400ms hold re-stated the gesture with a synthetic
`pointerdown` on the element underneath.

This worked but required synthesising input events, because the selection plugin
only begins on a pointerdown it observed and the gate had eaten the real one.
`minSelectionDragDistance` (§4) does the tap-safety half of this properly, in
one line of config — there is still no upstream equivalent for hold-to-arm.

### Why it was abandoned

Not one unresolved bug. Three failures in a row across pan, tap-safety and
highlight, each fixed by adding another layer of gesture arbitration on top of
plugins that already arbitrate gestures. The structural cause is in §8:
`touch-action: none` on the annotation layers means the app must decide what
every touch means, forever, for every tool.

Blocking the surface was cheaper than owning that permanently.

### What was deleted

| Removed | Reason |
| --- | --- |
| `lib/pdf/viewer-pan.ts` + test | Superseded by the Pan plugin |
| `components/evaluation/workspace/LongPressGate.tsx` | Only existed to stop touch creating annotations |
| `lib/pdf/long-press-gate.ts` + 9 tests | The gesture state machine behind it |
| `handleLongPressArm` in both workspaces | The synthetic-event retargeting |
| `touch-callout: none` rule in `globals.css` | Only needed to stop Chrome's image menu stealing the hold |

Kept: `@embedpdf/plugin-pan` and `GlobalPointerProvider`, which back the desktop
Hand tool.

---

## 7. If mobile is ever revisited (deferred, not recommended)

Do not read this as a backlog. The workspace is deliberately blocked on touch,
and nothing below is needed for the product as it stands.

If that call is reversed, this is the order that avoids re-treading section 6:

1. **`GlobalPointerProvider`** around `Viewport` + `Scroller` in both
   workspaces. No new dependency, largest payoff for drags that leave the
   viewer. Lowest risk. **Already done.**
2. **`@embedpdf/plugin-pan` + `defaultMode: 'mobile'`** with `usePan` driving
   the existing Hand button. **Already done, and still load-bearing on desktop.**
3. **`minSelectionDragDistance`** on the existing `SelectionPluginPackage`
   registration. One line; makes the tap-vs-drag threshold explicit instead of
   relying on the default.
4. **`@embedpdf/plugin-zoom` + `ZoomGestureWrapper`** for pinch-to-zoom. Also
   needs a decision on `FitWidth` as the mobile default, since a page wider than
   a phone viewport is the original complaint.
5. **`deactivateToolAfterCreate: true`** on the annotation plugin — fewer
   accidental second annotations.

Steps 3 and 5 are desktop-safe and could be taken without unblocking mobile.
Step 4 is the one that would most improve reading a document on a phone, if that
ever matters separately from annotating one.

---

## 8. Gotchas worth remembering

The first entry is the one that ended mobile support. The rest are ordinary
footguns.

- **`touch-action: none` on the annotation layers is the structural blocker.**
  It means the browser refuses to scroll on touch, so *something* must own
  scrolling — and once the app does, it also owns deciding what every touch
  means: pan, text selection, or placing an annotation. That arbitration is the
  plugins' job, and reimplementing it on top of them is what did not converge
  (§6). Any future attempt should start by asking EmbedPDF how to delegate this,
  not by adding an overlay.
- **No dedicated mobile docs.** Mobile behaviour is spread across the plugins
  above; searching the docs for "mobile" alone will miss most of it.
- **Provider nesting is mandatory.** `PagePointerProvider` per page for layers;
  `GlobalPointerProvider` around the viewport for pan. Layers outside them
  silently receive nothing.
- **`menuWrapperProps` must be spread.** Both selection and annotation menus use
  it for rotation-aware positioning; omitting it detaches the menu.
- **`ScrollScope.viewport` and `scrollToPage` are private.** The public
  scroll scope only exposes `scrollToPage`, `scrollToNextPage`,
  `scrollToPreviousPage`, `forDocument(id)`, `onLayoutReady` and
  `onPageChange`. There is no `scrollBy`, which is why the deleted
  `viewer-pan.ts` wrote `scrollLeft`/`scrollTop` directly via `useViewportRef`.
- **Plugin registration order matters.** Dependencies before dependents:
  Viewport + InteractionManager before Pan; InteractionManager before Selection
  and Annotation.
- **Peer deps are pinned exactly.** Every `@embedpdf/*` package resolves
  `core@2.15.0`, so installing `@embedpdf/plugin-pan` at `2.15.1` fails with
  `ERESOLVE`. Match the exact version.
- **Docs cover the current stable line.** `@embedpdf/plugin-pan` and
  `@embedpdf/plugin-zoom` are both published at `2.15.0`, matching our
  `2.15.x` — so the pages above describe code we can actually install.

---

## Related

- `components/workspace/MobileUnsupported.tsx` — the notice shown on touch
- `lib/hooks/useMediaQuery.ts` — `useIsCoarsePointer()`, the `pointer: coarse`
  guard. Prefer it over a width check for "can this be used with a mouse?": a
  tablet in landscape is wider than a small laptop window, but a tablet with a
  trackpad reports a fine pointer and should not be blocked.