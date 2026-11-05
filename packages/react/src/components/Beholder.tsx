import { useId, useRef } from 'react';
import { useGaze } from './gaze.js';
import type { Phase } from '../events.js';

/** How far the big pupil travels from center, in viewBox units. */
const REACH = 5.5;
/** The small eyes on the stalks move this much of it. */
const PEEK = 0.2;

// A flame-shaped body whose five tongues end in eyestalks.
const BODY = 'M32 61 C18.5 61 9 52.5 9 42 C9 35.5 11.5 31 14.5 27.5 C12 25 9 22 8.5 17.5 C12.5 19 15.5 21.5 18 25 C16.5 19 15.5 12 17.5 7.5 C20.5 11 23.5 15.5 25.5 20.5 C25.5 13 28.5 7 33 2.5 C36.5 7.5 38.5 13.5 38.5 20.5 C40.5 15.5 43.5 11 46.5 7.5 C48.5 12 47.5 19 46 25 C48.5 21.5 51.5 19 55.5 17.5 C55 22 52 25 49.5 27.5 C52.5 31 55 35.5 55 42 C55 52.5 45.5 61 32 61 Z';
// A smaller flame inside it, lighter, behind the eye.
const FLAME = 'M32 55 C21 55 15.5 48 16.5 40 C17.3 34.5 20 30.5 22 27.5 C23 30.5 24.5 31.8 26 31.2 C25.5 25 28.5 19 32 14 C35.5 19 38.5 25 38 31.2 C39.5 31.8 41 30.5 42 27.5 C44 30.5 46.7 34.5 47.5 40 C48.5 48 43 55 32 55 Z';
const EYE = 'M16.5 40 C23 30.5 41 30.5 47.5 40 C41 49 23 49 16.5 40 Z';
/** The eyestalk tips: x, y, radius. */
const STALKS: [number, number, number][] = [[9.3, 17.6, 2.5], [17.8, 7.9, 2.6], [33, 3.4, 2.8], [46.2, 7.9, 2.6], [54.7, 17.6, 2.5]];

/**
 * The default mascot: a beholder, a flame-shaped body with one big eye and
 * eyestalks on top, every eye following the cursor. Idle, the eyes blink now and
 * then; thinking, the gaze drifts up and the pupil narrows; using a tool, it
 * scans side to side, the iris ring turns and the stalk eyes blink in turn;
 * speaking, the iris pulses. Its colors are its own (deep purples, see the
 * --ak-beholder-* variables in styles.css), so it reads on light and dark.
 */
export function Beholder({ phase = 'idle', size = 28, jumping, label, className }: {
	phase?: Phase;
	size?: number;
	/** Jumps while idle: only where it is an invitation (the corner button before the first click). */
	jumping?: boolean;
	/** Set when it stands alone; next to text that already says "Assistant", leave it decorative. */
	label?: string;
	className?: string;
}) {
	const id = useId().replace(/:/g, '');
	const svg = useRef<SVGSVGElement>(null);

	// CSS px on an SVG element are user units, so these move in viewBox units.
	// The eye is wider than tall: less room to travel vertically.
	useGaze(svg, (x, y) => {
		const s = svg.current?.style;
		if (!s) return;
		s.setProperty('--ak-look', `translate(${(x * REACH).toFixed(2)}px, ${(y * REACH * 0.55).toFixed(2)}px)`);
		s.setProperty('--ak-peek', `translate(${(x * REACH * PEEK).toFixed(2)}px, ${(y * REACH * PEEK).toFixed(2)}px)`);
	});

	return (
		<svg ref={svg} viewBox="0 0 64 64" width={size} height={size} focusable="false"
			className={['ak-mascot', 'ak-beholder', `ak-beholder--${phase}`, jumping && phase === 'idle' && 'ak-jump', className].filter(Boolean).join(' ')}
			{...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
			<defs>
				<linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" className="ak-beholder__body-top" />
					<stop offset="1" className="ak-beholder__body-bottom" />
				</linearGradient>
				<radialGradient id={`${id}-iris`} cx="40%" cy="35%" r="75%">
					<stop offset="0" className="ak-beholder__iris-light" />
					<stop offset="1" className="ak-beholder__iris-dark" />
				</radialGradient>
				<clipPath id={`${id}-body-clip`}><path d={BODY} /></clipPath>
				<clipPath id={`${id}-eye`}><path d={EYE} /></clipPath>
			</defs>

			{/* the body: fill, the inner flame and a shadow at the base, then the outline */}
			<path d={BODY} fill={`url(#${id}-body)`} />
			<g clipPath={`url(#${id}-body-clip)`}>
				<path className="ak-beholder__flame" d={FLAME} />
				<ellipse className="ak-beholder__shade" cx="32" cy="64" rx="26" ry="9" />
			</g>
			<path className="ak-beholder__line" d={BODY} fill="none" strokeWidth="2" strokeLinejoin="round" />

			{/* the eyestalks' eyes */}
			<g className="ak-beholder__stalks">
				{STALKS.map(([cx, cy, r], i) => (
					<g key={i} className="ak-beholder__stalk" style={{ animationDelay: `${i * 0.13}s` }}>
						<circle className="ak-beholder__white ak-beholder__line" cx={cx} cy={cy} r={r} strokeWidth="1.2" />
						<g className="ak-beholder__peek">
							<circle className="ak-beholder__dot" cx={cx} cy={cy} r={r * 0.44} />
						</g>
					</g>
				))}
			</g>

			{/* the big eye: the white, then the iris and pupil inside it, then the lids on top */}
			<g className="ak-beholder__eye">
				<path className="ak-beholder__white" d={EYE} />
				<g clipPath={`url(#${id}-eye)`}>
					<g className="ak-beholder__look">
						<g className="ak-beholder__gaze">
							<circle className="ak-beholder__iris" cx="32" cy="40" r="8" fill={`url(#${id}-iris)`} />
							<circle className="ak-beholder__ring" cx="32" cy="40" r="5.8" fill="none" strokeWidth="1" strokeDasharray="2.4 1.8" />
							<circle className="ak-beholder__pupil" cx="32" cy="40" r="3.6" />
							<circle className="ak-beholder__glint" cx="29.8" cy="37.8" r="1.4" />
						</g>
					</g>
				</g>
				<path className="ak-beholder__line" d={EYE} fill="none" strokeWidth="2" strokeLinejoin="round" />
				{/* a heavy upper lid: a half-closed, watchful look */}
				<path className="ak-beholder__line" d="M17.5 38.2 C24 32.5 40 32.5 46.5 38.2" fill="none" strokeWidth="3" strokeLinecap="round" />
			</g>
		</svg>
	);
}
