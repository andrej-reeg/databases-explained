import React, {useEffect, useId, useState} from 'react';
import {getCaretCoords} from '../lib/caret';
import {computeSuggestions} from '../lib/suggest';
import type {SugItem, SugState, Vocab} from '../types';

type Args = {
  editorWrapRef: React.RefObject<HTMLDivElement | null>;
  vocabRef: React.RefObject<Vocab>;
  setQuery: (v: string) => void;
};

/**
 * Drives the editor's autocomplete: maintains the open-dropdown state, positions
 * it at the caret (flipping above when it would overflow), navigates/accepts
 * items, and keeps both the position and ARIA wiring in sync.
 */
export function useAutocomplete({editorWrapRef, vocabRef, setQuery}: Args) {
  const listId = useId();
  const [sug, setSug] = useState<SugState | null>(null);

  const textarea = () =>
    (editorWrapRef.current?.querySelector('textarea') as HTMLTextAreaElement | null) ?? null;

  // Viewport coords for the dropdown (position: fixed, so it is never clipped by
  // the editor's scroll container). Flips above the caret when the box would run
  // off the bottom of the viewport.
  function coordsFor(ta: HTMLTextAreaElement, caretStart: number, count: number) {
    const c = getCaretCoords(ta, caretStart);
    const r = ta.getBoundingClientRect();
    const caretTop = r.top + c.top - ta.scrollTop;
    const left = r.left + c.left - ta.scrollLeft;
    const estHeight = Math.min(count, 8) * 26 + 8;
    const flipUp =
      caretTop + c.lineHeight + estHeight > window.innerHeight &&
      caretTop - estHeight > 0;
    return {top: flipUp ? caretTop - estHeight : caretTop + c.lineHeight, left};
  }

  // Recompute and (re)open the dropdown from the caret position.
  function refresh(ta: HTMLTextAreaElement) {
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) {
      setSug(null);
      return;
    }
    const result = computeSuggestions(ta.value, pos, vocabRef.current);
    if (!result) {
      setSug(null);
      return;
    }
    const {items, word} = result;
    const {top, left} = coordsFor(ta, pos - word.length, items.length);
    setSug({items, index: 0, word, top, left});
  }

  // Editor change: persist the value, then recompute suggestions next frame
  // (once the textarea's caret reflects the new value).
  function onEditorChange(v: string) {
    setQuery(v);
    requestAnimationFrame(() => {
      const ta = textarea();
      if (ta) refresh(ta);
    });
  }

  // Replace the word at the caret with the chosen suggestion + a trailing space.
  function accept(item: SugItem) {
    const ta = textarea();
    if (!ta || !sug) return;
    const pos = ta.selectionStart;
    const start = pos - sug.word.length;
    const after = ta.value.slice(pos);
    // Mirror the learner's casing: keep keywords lowercase if they typed lower.
    const lowerKw =
      item.kind === 'keyword' &&
      /[a-z]/.test(sug.word) &&
      sug.word === sug.word.toLowerCase();
    const text = lowerKw ? item.text.toLowerCase() : item.text;
    // Always leave a single trailing space; reuse one already there.
    const insert = text + (after.startsWith(' ') ? '' : ' ');
    setQuery(ta.value.slice(0, start) + insert + after);
    setSug(null);
    const caret = start + text.length + 1; // past the trailing space
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = caret;
      // After a clause keyword, chain straight into its names (SELECT -> columns,
      // FROM -> tables). After picking a name, stay quiet.
      if (item.kind === 'keyword') refresh(ta);
    });
  }

  // Handle dropdown navigation keys. Returns true if the event was consumed.
  function handleKeyDown(e: React.KeyboardEvent): boolean {
    if (!sug || sug.items.length === 0) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSug((s) => (s ? {...s, index: (s.index + 1) % s.items.length} : s));
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSug((s) =>
        s ? {...s, index: (s.index - 1 + s.items.length) % s.items.length} : s,
      );
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      accept(sug.items[sug.index]);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setSug(null);
      return true;
    }
    return false;
  }

  // Close on blur, delayed so a click on a suggestion still lands first.
  function onEditorBlur() {
    window.setTimeout(() => setSug(null), 120);
  }

  const setActive = (i: number) => setSug((s) => (s ? {...s, index: i} : s));
  const close = () => setSug(null);

  // Keep the open dropdown pinned to the caret when the page/editor scrolls or
  // the window resizes (position: fixed coords are otherwise computed once).
  useEffect(() => {
    if (!sug) return undefined;
    const onMove = () => {
      const ta = textarea();
      if (!ta) return;
      setSug((s) => {
        if (!s) return s;
        const {top, left} = coordsFor(ta, ta.selectionStart - s.word.length, s.items.length);
        return {...s, top, left};
      });
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sug]);

  // Wire ARIA combobox state onto the textarea (react-simple-code-editor spreads
  // unknown props onto its wrapper div, not the textarea, so set them directly).
  useEffect(() => {
    const ta = textarea();
    if (!ta) return;
    ta.setAttribute('role', 'combobox');
    ta.setAttribute('aria-autocomplete', 'list');
    if (sug && sug.items.length) {
      ta.setAttribute('aria-expanded', 'true');
      ta.setAttribute('aria-controls', listId);
      ta.setAttribute('aria-activedescendant', `${listId}-opt-${sug.index}`);
    } else {
      ta.setAttribute('aria-expanded', 'false');
      ta.removeAttribute('aria-controls');
      ta.removeAttribute('aria-activedescendant');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sug, listId]);

  return {sug, listId, onEditorChange, onEditorBlur, handleKeyDown, accept, setActive, close};
}
