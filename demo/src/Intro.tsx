// The intro on a first visit: the libraries video (rubrion-landing/video, copied
// into public/video), in Portuguese for a Portuguese browser. It doesn't open
// again in this browser (localStorage; every time if that's blocked); the
// header's "Watch the intro" opens it on demand.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SEEN = 'beholder-intro';
const pt = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('pt');
const T = pt
	? { label: 'Introdução ao Beholder', title: 'Conheça o Beholder', text: 'O mascote do kit de agentes da Rubrion, de código aberto no npm. Feche e mova o cursor: todos os olhos seguem você.', start: 'Explorar' }
	: { label: 'Beholder intro', title: 'Meet Beholder', text: "The mascot of Rubrion's open-source agent kit, on npm. Close this and move your cursor: every eye follows you.", start: 'Start exploring' };

export type IntroHandle = { open: () => void };

export const Intro = forwardRef<IntroHandle>(function Intro(_, ref) {
	const dialog = useRef<HTMLDialogElement>(null);
	const video = useRef<HTMLVideoElement>(null);
	const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	const open = () => {
		dialog.current?.showModal();
		if (!reduce) video.current?.play().catch(() => {});
	};
	useImperativeHandle(ref, () => ({ open }));

	useEffect(() => {
		let seen = false;
		try {
			seen = localStorage.getItem(SEEN) === 'done';
		} catch {}
		if (!seen) open();
	}, []);

	const close = () => {
		try {
			localStorage.setItem(SEEN, 'done');
		} catch {}
		video.current?.pause();
		dialog.current?.close();
	};

	return (
		<dialog ref={dialog} className="intro" aria-label={T.label} onCancel={close} onClick={(e) => e.target === dialog.current && close()}>
			<video ref={video} src={`/video/agent-libraries-${pt ? 'pt' : 'en'}.mp4`} poster={`/video/agent-libraries-${pt ? 'pt' : 'en'}.webp`} width={1280} height={720} controls muted loop playsInline />
			<div className="intro__body">
				<h2>{T.title}</h2>
				<p>{T.text}</p>
				<button type="button" className="intro__start" onClick={close} autoFocus>{T.start}</button>
			</div>
		</dialog>
	);
});
