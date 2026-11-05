import { Beholder, Eye, type Phase } from '@rubrion/beholder-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Intro, type IntroHandle } from './Intro';

const PHASES: { id: Phase; label: string; note: string }[] = [
	{ id: 'idle', label: 'Idle', note: 'Waiting. The eyes blink now and then, each on its own beat.' },
	{ id: 'thinking', label: 'Thinking', note: 'The gaze drifts up and the pupil narrows. The stalk eyes look up too.' },
	{ id: 'tool', label: 'Using a tool', note: 'Scanning side to side, the iris ring turning, the stalk eyes blinking in turn.' },
	{ id: 'speaking', label: 'Speaking', note: 'The iris pulses with the words.' },
];

/** One answer, played back: what a chat shows while the agent works. */
const ANSWER: [Phase, number][] = [['thinking', 2200], ['tool', 2000], ['thinking', 1200], ['speaking', 2600], ['idle', 2000]];

/** Color presets, through the --ak-beholder-* variables. Default is the kit's own. */
const PALETTES: { id: string; label: string; vars?: Record<string, string> }[] = [
	{ id: 'default', label: 'Default' },
	{ id: 'ember', label: 'Ember', vars: { '--ak-beholder-body-top': '#6a2424', '--ak-beholder-body-bottom': '#2e1111', '--ak-beholder-flame': '#8a3a2a', '--ak-beholder-iris-light': '#e0a050', '--ak-beholder-iris-dark': '#8a4a12', '--ak-beholder-rim': '#6e3a30' } },
	{ id: 'abyss', label: 'Abyss', vars: { '--ak-beholder-body-top': '#1f3a52', '--ak-beholder-body-bottom': '#0e1a26', '--ak-beholder-flame': '#2c5677', '--ak-beholder-iris-light': '#5fc4c0', '--ak-beholder-iris-dark': '#1f6f78', '--ak-beholder-rim': '#2e5675' } },
];

export function App() {
	const [phase, setPhase] = useState<Phase>('idle');
	const [playing, setPlaying] = useState(false);
	const [size, setSize] = useState(240);
	const [palette, setPalette] = useState('default');
	const [light, setLight] = useState(false);
	const intro = useRef<IntroHandle>(null);

	useEffect(() => {
		if (!playing) return;
		let i = 0;
		let t: ReturnType<typeof setTimeout>;
		const step = () => {
			const [p, ms] = ANSWER[i];
			setPhase(p);
			i = (i + 1) % ANSWER.length;
			t = setTimeout(step, ms);
		};
		step();
		return () => clearTimeout(t);
	}, [playing]);

	const vars = PALETTES.find((p) => p.id === palette)?.vars as CSSProperties | undefined;
	const note = PHASES.find((p) => p.id === phase)!.note;

	return (
		<main className={light ? 'light' : undefined}>
			<Intro ref={intro} />
			<header>
				<span className="eyebrow">@rubrion/beholder-react</span>
				<h1>Beholder</h1>
				<p>The kit's default mascot. A flame-shaped body, one big eye and five eyestalks, every eye following your cursor. Move the pointer around, switch the phase, or play a whole answer.</p>
				<button type="button" className="watch" onClick={() => intro.current?.open()}>▶ Watch the intro</button>
			</header>

			<div className="stage" style={vars}>
				<Beholder phase={phase} size={size} label="Beholder, the agent kit's mascot" />
			</div>

			<div className="controls">
				<div className="group" role="radiogroup" aria-label="Phase">
					{PHASES.map((p) => (
						<button key={p.id} type="button" role="radio" aria-checked={phase === p.id} onClick={() => { setPlaying(false); setPhase(p.id); }}>{p.label}</button>
					))}
					<button type="button" className="play" aria-pressed={playing} onClick={() => setPlaying((v) => !v)}>{playing ? 'Stop' : 'Play an answer'}</button>
				</div>
				<p className="note">{note}</p>
				<div className="row">
					<label htmlFor="size">Size <output>{size}px</output></label>
					<input id="size" type="range" min={16} max={360} value={size} onChange={(e) => setSize(+e.target.value)} />
				</div>
				<div className="row">
					<span>Colors</span>
					<div className="group" role="radiogroup" aria-label="Colors">
						{PALETTES.map((p) => (
							<button key={p.id} type="button" role="radio" aria-checked={palette === p.id} onClick={() => setPalette(p.id)}>{p.label}</button>
						))}
					</div>
				</div>
				<div className="row">
					<span>Page</span>
					<div className="group" role="radiogroup" aria-label="Page">
						<button type="button" role="radio" aria-checked={!light} onClick={() => setLight(false)}>Dark</button>
						<button type="button" role="radio" aria-checked={light} onClick={() => setLight(true)}>Light</button>
					</div>
				</div>
			</div>

			<section className="sizes" aria-label="Where it shows up" style={vars}>
				{[20, 28, 40, 64].map((s) => (
					<figure key={s}><Beholder phase={phase} size={s} /><figcaption>{s}px</figcaption></figure>
				))}
				<figure className="chat">
					<div className="bubble"><Beholder phase={phase} size={28} /><span>{phase === 'idle' ? 'Ask me anything about your docs.' : phase === 'speaking' ? 'Here is what I found…' : phase === 'tool' ? 'Reading the docs…' : 'Thinking…'}</span></div>
					<figcaption>next to an answer</figcaption>
				</figure>
				<figure className="corner"><span className="fab"><Beholder phase="idle" size={34} jumping /></span><figcaption>corner button</figcaption></figure>
			</section>

			<section className="compare" aria-label="The other mascot">
				<figure><Beholder phase={phase} size={72} /><figcaption>&lt;Beholder /&gt;, the default</figcaption></figure>
				<figure><Eye phase={phase} size={72} /><figcaption>&lt;Eye /&gt;, the first one, still shipped</figcaption></figure>
			</section>

			<section className="code">
				<h2>Use it</h2>
				<p>Every <code>ChatBox</code> and <code>AssistantScreen</code> shows it by default. On its own:</p>
				<pre>{`import { Beholder } from '@rubrion/beholder-react';
import '@rubrion/beholder-react/styles.css';

<Beholder phase="thinking" size={40} label="Assistant" />`}</pre>
				<p>Recolor it with CSS variables, or bring back the eye with <code>renderMascot</code>:</p>
				<pre>{`.ak-beholder {
  --ak-beholder-body-top: #41246a;    /* body-bottom, flame, line, rim, white, */
  --ak-beholder-iris-light: #9468d6;  /* iris-dark, pupil */
}

<AgentProvider renderMascot={(p) => <Eye {...p} />} … />`}</pre>
			</section>
		</main>
	);
}
