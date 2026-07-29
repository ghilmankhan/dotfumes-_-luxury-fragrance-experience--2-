/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared choreography helpers layered on top of the project's existing motion
// tokens (src/styles/tokens/motion.ts). Motion.dev (framer-motion) already
// owns every declarative gesture/presence/layout animation in the app — the
// exports below only add the pieces Motion's declarative API can't express
// well: imperative Anime.js sequences for things that happen *outside* of a
// component's normal render (a DOM node collapsing before it unmounts, a
// one-shot feedback pulse tied to a click). Every export takes the caller's
// own `reduceMotion` boolean (from the same `useReducedMotion()` hook already
// used everywhere else) instead of re-detecting the media query, so there is
// still exactly one source of truth for motion preference.
import { animate } from 'animejs';

/**
 * Collapses a DOM node (cart line item) out of view: fade + slide-right,
 * then height/spacing collapse so siblings close the gap — ~400ms total.
 * Calls `onComplete` when the sequence finishes (or immediately, with no
 * animation, when the user prefers reduced motion) so the caller can perform
 * the actual state removal only once the item has visually left.
 */
export const runCollapseSequence = (
  el: HTMLElement,
  reduceMotion: boolean,
  onComplete: () => void,
) => {
  if (reduceMotion) {
    onComplete();
    return;
  }

  const computed = window.getComputedStyle(el);
  const startHeight = el.offsetHeight;
  const startMarginBottom = parseFloat(computed.marginBottom) || 0;
  const startPaddingTop = parseFloat(computed.paddingTop) || 0;
  const startPaddingBottom = parseFloat(computed.paddingBottom) || 0;

  el.style.overflow = 'hidden';

  animate(el, {
    opacity: [1, 0],
    translateX: [0, 24],
    duration: 220,
    ease: 'outQuad',
  });

  animate(el, {
    height: [startHeight, 0],
    marginBottom: [startMarginBottom, 0],
    paddingTop: [startPaddingTop, 0],
    paddingBottom: [startPaddingBottom, 0],
    duration: 260,
    delay: 140,
    ease: 'inOutQuad',
    onComplete,
  });
};

/**
 * Small, single, non-bouncy scale pop used to confirm a value changed
 * (quantity stepper tick, cart count badge). Never loops, never overshoots
 * into a spring/elastic ease — a luxury "acknowledgement", not an attention
 * grab.
 */
export const runScalePulse = (
  el: HTMLElement | null,
  reduceMotion: boolean,
  peak = 1.08,
  durationMs = 320,
) => {
  if (!el || reduceMotion) {
    return;
  }
  animate(el, {
    scale: [1, peak, 1],
    duration: durationMs,
    ease: 'inOutQuad',
  });
};

/**
 * One-shot expanding-ring feedback for the product grid quick-add button:
 * the ring scales up and fades out exactly once (not a looping ping).
 */
export const runRingPulse = (el: HTMLElement | null, reduceMotion: boolean) => {
  if (!el || reduceMotion) {
    return;
  }
  animate(el, {
    scale: [1, 1.8],
    opacity: [0.6, 0],
    duration: 500,
    ease: 'outQuad',
  });
};
