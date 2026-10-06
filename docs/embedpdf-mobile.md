# EmbedPDF: Mobile & Touch Documentation Reference

Everything EmbedPDF documents about touch, and how it maps onto our PDF review
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

**Our status: NOT USED.** This is the single highest-value gap in this file.

---

## 2. Pan plugin — touch panning is already solved for us

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

**Our status: NOT INSTALLED, NOT REGISTERED.** We hand-rolled panning instead —
see §6.

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

**Our status: NOT INSTALLED, NOT REGISTERED.** `ZoomControl.tsx` is a custom
stepper driving the render plugin's scale directly, so **we have no
pinch-to-zoom at all**. Users must tap `+`/`-`.

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

## 6. What we hand-rolled, and what the docs say instead

Honest audit of the mobile work in this repo versus upstream.

| We built | Upstream equivalent | Verdict |
| --- | --- | --- |
| `lib/pdf/viewer-pan.ts` — clamped pan maths | Pan plugin (`plugin-pan`) | **Replace.** Reimplementing a shipped plugin. |
| Pan on `pointerdown/move/up` in the workspace | Pan plugin + `GlobalPointerProvider` | **Replace.** Missing global pointer capture, which is why drags die at the viewer edge. |
| `LongPressGate` — swallow the gesture, then re-state it with a synthetic `pointerdown` | `minSelectionDragDistance` | **Partial replace.** See below. |
| `ZoomControl.tsx` — custom stepper | `ZoomGestureWrapper` | **Add.** We have no pinch-to-zoom. |
| `touch-callout: none` in `globals.css` | — | **Keep.** Not an EmbedPDF concern; browser-level. |
| `data-annotation-drag` exempt touch starts | — | **Keep.** Still needed on top of anything upstream. |

### The long-press gate is not fully replaceable

`minSelectionDragDistance` prevents a *click* from starting a selection. That
solves half the problem (tap must not annotate) in one line of config.

It does **not** deliver hold-to-arm semantics: there is no upstream option for
"only begin annotating after the finger has been still for 400ms, then let the
user drag to select". That requirement is ours, so some gate remains. What the
docs *do* let us delete is the synthetic-`pointerdown` machinery, which exists
only because we disabled the plugin's own gesture handling. Enabling selection
upstream and gating on movement instead would avoid synthesising input events.

**Do not remove the gate before §7's items are in place** — the current code is
load-bearing for both scroll and annotate.

---

## 7. Recommended integration order

1. **`GlobalPointerProvider`** around `Viewport` + `Scroller` in both
   workspaces. No new dependency, largest payoff for drags that leave the
   viewer. Lowest risk.
2. **`@embedpdf/plugin-pan` + `defaultMode: 'mobile'`** with `usePan` driving
   our existing Hand button. Delete `viewer-pan.ts` and the workspace pan
   handlers. Keep the gate's scroll path until the plugin is verified on device.
3. **`minSelectionDragDistance`** on the existing `SelectionPluginPackage`
   registration. One line; make the tap-vs-drag threshold explicit.
4. **`@embedpdf/plugin-zoom` + `ZoomGestureWrapper`** for pinch-to-zoom. Replaces
   or wraps `ZoomControl.tsx`; needs a decision on `FitWidth` as the mobile
   default, since a page wider than a phone viewport is the current complaint.
5. **`deactivateToolAfterCreate: true`** on the annotation plugin — fewer
   accidental second annotations.
6. Only then revisit the `LongPressGate`: keep the long-press requirement, drop
   the synthetic event if upstream selection can be gated on movement instead.

Steps 1–3 are cheap and low-risk. Steps 2 and 4 need real-device testing.

---

## 8. Gotchas worth remembering

- **No dedicated mobile docs.** Mobile behaviour is spread across the plugins
  above; searching the docs for "mobile" alone will miss most of it.
- **Provider nesting is mandatory.** `PagePointerProvider` per page for layers;
  `GlobalPointerProvider` around the viewport for pan. Layers outside them
  silently receive nothing.
- **`menuWrapperProps` must be spread.** Both selection and annotation menus use
  it for rotation-aware positioning; omitting it detaches the menu.
- **`touch-action: none` on annotation layers means the browser will not scroll.**
  Whatever owns touch scrolling has to do it explicitly. This is the root cause
  of our scroll bugs — see `app/globals.css` and `LongPressGate`.
- **`ScrollScope.viewport` and `scrollToPage` are private.** The public
  scroll scope only exposes `scrollToPage`, `scrollToNextPage`,
  `scrollToPreviousPage`, `forDocument(id)`, `onLayoutReady` and
  `onPageChange`. There is no `scrollBy` — which is why `viewer-pan.ts` writes
  `scrollLeft`/`scrollTop` directly via `useViewportRef`.
- **Plugin registration order matters.** Dependencies before dependents:
  Viewport + InteractionManager before Pan; InteractionManager before Selection
  and Annotation.
- **Docs cover the current stable line.** `@embedpdf/plugin-pan` and
  `@embedpdf/plugin-zoom` are both published at `2.15.0`, matching our
  `2.15.x` — so the pages above describe code we can actually install.