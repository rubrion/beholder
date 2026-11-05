import { useId, useRef } from 'react';
import { useGaze } from './gaze.js';
import type { Phase } from '../events.js';

/** How far the pupil travels from center, in viewBox units. */
const REACH = 6.5;

/**
 * The kit's first mascot, kept as an alternative to the Beholder: a stylized
 * eye whose pupil follows the cursor. Idle, it blinks now and then; thinking, the pupil drifts up and narrows; using a tool,
 * it scans side to side while the iris ring turns; speaking, the iris pulses.
 * Colors come from the theme (--primary for the iris, --foreground for the
 * pupil and the outline), so it reads on light and dark. Use it with
 * renderMascot={(p) => <Eye {...p} />}.
 */
export function Eye({ phase = 'idle', size = 28, jumping, label, className }: {
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
	const look = useRef<SVGGElement>(null);

	useGaze(svg, (x, y) => {
		// the eye is wider than tall: less room to travel vertically
		// CSS px on an SVG element are user units, so this moves in viewBox units
		if (look.current) look.current.style.transform = `translate(${(x * REACH).toFixed(2)}px, ${(y * REACH * 0.6).toFixed(2)}px)`;
	});

	return (
		<svg ref={svg} viewBox="0 0 64 64" width={size} height={size} focusable="false"
			className={['ak-mascot', `ak-mascot--${phase}`, jumping && phase === 'idle' && 'ak-jump', className].filter(Boolean).join(' ')}
			{...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
			<defs>
				<radialGradient id={`${id}-iris`} cx="40%" cy="38%" r="70%">
					<stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
					<stop offset="100%" stopColor="currentColor" />
				</radialGradient>
				<clipPath id={`${id}-eye`}>
					<path d="M7 32 C17 15 47 15 57 32 C47 49 17 49 7 32 Z" />
				</clipPath>
			</defs>

			{/* the badge */}
			<circle cx="32" cy="32" r="30" className="ak-mascot__badge" strokeWidth="2" />

			{/* the eye: the white, then the iris and pupil inside it, then the lids on top */}
			<g className="ak-mascot__eye">
				<path className="ak-mascot__white" d="M7 32 C17 15 47 15 57 32 C47 49 17 49 7 32 Z" />
				<g clipPath={`url(#${id}-eye)`}>
					<g ref={look} className="ak-mascot__look">
						<g className="ak-mascot__gaze">
							<circle className="ak-mascot__iris" cx="32" cy="32" r="11.5" fill={`url(#${id}-iris)`} />
							<circle className="ak-mascot__ring" cx="32" cy="32" r="8.6" fill="none" strokeWidth="1.3" strokeDasharray="3.2 2.4" />
							<circle className="ak-mascot__pupil" cx="32" cy="32" r="4.6" />
							<circle className="ak-mascot__glint" cx="29.2" cy="29" r="1.7" />
						</g>
					</g>
				</g>
				<path className="ak-mascot__lid" d="M7 32 C17 15 47 15 57 32 C47 49 17 49 7 32 Z" fill="none" strokeWidth="2.4" strokeLinejoin="round" />
				{/* a stroke of upper lid, heavier, so the shape reads as an eye at 24px */}
				<path className="ak-mascot__lash" d="M9 30 C19 15.5 45 15.5 55 30" fill="none" strokeWidth="3.4" strokeLinecap="round" />
			</g>
		</svg>
	);
}
