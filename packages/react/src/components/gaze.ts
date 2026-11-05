import { useEffect, type RefObject } from 'react';

/*
 * One pointer listener for every mascot on the page (there is one next to each
 * answer): the position is kept here and each mascot reads it on the next frame.
 */
type Watcher = () => void;
const watchers = new Set<Watcher>();
let pointer: { x: number; y: number } | null = null;
let frame = 0;
function onMove(e: PointerEvent) {
	pointer = { x: e.clientX, y: e.clientY };
	if (frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		watchers.forEach((w) => w());
	});
}
function watch(w: Watcher) {
	if (!watchers.size) window.addEventListener('pointermove', onMove, { passive: true });
	watchers.add(w);
	return () => {
		watchers.delete(w);
		if (!watchers.size) window.removeEventListener('pointermove', onMove);
	};
}

/** Pointer distance (px) at which an eye looks as far as it can. */
const FULL = 240;

/**
 * Calls aim(x, y) whenever the pointer moves, with the direction from the
 * element's center to the pointer, scaled to 0..1 by distance (1 at FULL px).
 * Does nothing for people who prefer reduced motion.
 */
export function useGaze(el: RefObject<Element | null>, aim: (x: number, y: number) => void) {
	useEffect(() => {
		if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const run = () => {
			const node = el.current;
			if (!node || !pointer) return;
			const r = node.getBoundingClientRect();
			if (!r.width) return;
			const dx = pointer.x - (r.left + r.width / 2);
			const dy = pointer.y - (r.top + r.height / 2);
			const d = Math.hypot(dx, dy) || 1;
			const k = Math.min(d, FULL) / FULL;
			aim((dx / d) * k, (dy / d) * k);
		};
		run();
		return watch(run);
		// aim is expected to only touch refs, so the first one is enough
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
