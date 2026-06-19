// Pixel position of the caret inside a textarea, via a hidden mirror element
// that copies the textarea's text metrics. Returns coords relative to the
// textarea's own top-left (so callers subtract scroll offsets themselves).
export function getCaretCoords(
  el: HTMLTextAreaElement,
  position: number,
): {top: number; left: number; lineHeight: number} {
  const div = document.createElement('div');
  const cs = window.getComputedStyle(el);
  const props = [
    'boxSizing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'fontFamily', 'lineHeight', 'letterSpacing', 'wordSpacing', 'tabSize',
    'textIndent', 'textTransform',
  ] as const;
  const s = div.style;
  s.position = 'absolute';
  s.visibility = 'hidden';
  s.whiteSpace = 'pre-wrap';
  s.wordWrap = 'break-word';
  s.width = `${el.clientWidth}px`;
  props.forEach((p) => {
    s[p as any] = cs[p as any];
  });
  div.textContent = el.value.slice(0, position);
  const span = document.createElement('span');
  span.textContent = el.value.slice(position) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  const coords = {top: span.offsetTop, left: span.offsetLeft, lineHeight};
  document.body.removeChild(div);
  return coords;
}
