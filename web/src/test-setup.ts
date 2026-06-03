// Polyfills for DOM APIs that jsdom does not implement but that ProseMirror
// (which powers Tiptap) calls during editor setup and rendering. Without these
// the editor throws while mounting under jsdom. They return inert values since
// layout/coordinates are meaningless in a headless DOM.

if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  });
}
