import { ArrowDown, ArrowUp, FileText, LoaderCircle, Paperclip, Square, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Phase, Turn } from '../events.js';
import { useAgent } from '../provider.js';
import { Markdown, ThinkStep, ToolStep } from './Steps.js';
import { Avatar, IconButton, cn } from './ui.js';

/** Instead of the conversation: loading, offline, or blocked by the preflight (missing key, budget…). */
export function Availability({ children }: { children: ReactNode }) {
	const { available, status, error, activate, t, config } = useAgent();
	useEffect(() => { activate(); }, [activate]);
	if (available === null) {
		return <div className="grid gap-2 p-4"><div className="h-16 animate-pulse rounded-md bg-muted" /><div className="h-10 w-2/3 animate-pulse rounded-md bg-muted" /></div>;
	}
	if (status && !status.ready) {
		return config.renderBlocked ? <>{config.renderBlocked(status)}</> : (
			<div className="grid justify-items-center gap-3 p-6 text-center text-sm" role="alert">
				<Avatar size={56} />
				<p className="font-medium">{t.notReady}</p>
				{status.message && <p className="text-muted-foreground">{status.message}</p>}
			</div>
		);
	}
	if (!available) {
		return (
			<div className="grid justify-items-center gap-2 p-6 text-center text-sm">
				<Avatar size={56} />
				<p>{t.offline}</p>
				<p className="text-muted-foreground">{error && !/offline/i.test(error) ? error : t.tryAgainSoon}</p>
			</div>
		);
	}
	return <>{children}</>;
}

/**
 * The conversation thread. Follows the answer only while the person is at the
 * bottom; scrolled up, an arrow brings them back. Scrolling the thread does by
 * itself (following, or the arrow) never counts as the person leaving the end.
 */
export function Thread({ compact, empty }: { compact?: boolean; empty: ReactNode }) {
	const { turns, phase, agents, t } = useAgent();
	const box = useRef<HTMLDivElement>(null);
	const end = useRef<HTMLDivElement>(null);
	const atEnd = useRef(true);
	const own = useRef(false);
	const [far, setFar] = useState(false);
	const onScroll = () => {
		const el = box.current;
		if (!el) return;
		const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
		if (own.current) { if (bottom) own.current = false; return; }
		atEnd.current = bottom;
		setFar(!bottom);
	};
	const down = () => {
		atEnd.current = true;
		own.current = true;
		setFar(false);
		end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
	};
	useEffect(() => {
		if (!atEnd.current) return;
		own.current = true;
		end.current?.scrollIntoView({ block: 'end' });
	}, [turns]);
	const nameOf = (id: string) => agents.find((a) => a.id === id)?.name ?? t.assistant;
	const last = turns[turns.length - 1];

	return (
		<div className="relative min-h-0 flex-1">
			<div ref={box} onScroll={onScroll} className="h-full overflow-y-auto" aria-live="polite">
				{!turns.length ? empty : (
					<ol className={cn('mx-auto grid gap-5', compact ? 'p-3' : 'max-w-3xl px-4 py-6')}>
						{turns.map((turn) => <Message key={turn.id} turn={turn} name={turn.role === 'assistant' ? nameOf(turn.agent) : ''}
							phase={turn === last ? phase : 'idle'} compact={compact} />)}
					</ol>
				)}
				<div ref={end} />
			</div>
			{far && turns.length > 0 && (
				<IconButton label={t.jumpToEnd} onClick={down}
					className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border bg-card text-foreground shadow-md"><ArrowDown /></IconButton>
			)}
		</div>
	);
}

function Message({ turn, name, phase, compact }: { turn: Turn; name: string; phase: Phase; compact?: boolean }) {
	const { t } = useAgent();
	if (turn.role === 'user') {
		return (
			<li className="ak-rise max-w-[85%] justify-self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-line text-primary-foreground">
				{turn.text}
			</li>
		);
	}
	return (
		<li className="ak-rise flex items-start gap-2.5">
			<Avatar size={compact ? 26 : 32} phase={phase} className="mt-0.5" />
			<div className="grid min-w-0 flex-1 gap-2">
				<p className="text-xs font-medium text-muted-foreground">{name}</p>
				{!turn.steps.length && !turn.done && (
					<span className="flex gap-1 py-1" aria-label={t.writing}>
						{[0, 1, 2].map((i) => <i key={i} className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" style={{ animationDelay: `${i * 160}ms` }} />)}
					</span>
				)}
				{turn.steps.map((s, i) => (s.kind === 'think' ? <ThinkStep key={i} step={s} />
					: s.kind === 'tool' ? <ToolStep key={s.id} step={s} /> : <Markdown key={i} text={s.text} />))}
				{turn.error && <p className="text-sm text-destructive" role="alert">{turn.error}</p>}
			</div>
		</li>
	);
}

/** The question field: grows with the text; Enter sends, Shift+Enter breaks the line; while answering, the button stops. */
type Attachment = { id: number; name: string; note?: string; error?: string };

export function Composer({ compact, placeholder, className }: { compact?: boolean; placeholder?: string; className?: string }) {
	const { busy, send, stop, available, config, t } = useAgent();
	const [text, setText] = useState('');
	const [files, setFiles] = useState<Attachment[]>([]);
	const field = useRef<HTMLTextAreaElement>(null);
	const picker = useRef<HTMLInputElement>(null);
	const next = useRef(0);
	useLayoutEffect(() => {
		const el = field.current;
		if (!el) return;
		el.style.height = 'auto';
		if (text) el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}, [text]);
	const uploading = files.some((f) => !f.note && !f.error);
	const ready = files.filter((f) => f.note);
	const canSend = (Boolean(text.trim()) || ready.length > 0) && !busy && available && !uploading;
	const submit = () => {
		if (!canSend) return;
		// The attachments' lines go with the question: they are what the agent reads.
		send([text.trim() || t.attachedOnly, ...ready.map((f) => f.note)].join('\n'));
		setText('');
		setFiles([]);
	};
	const attach = (list: FileList | null) => {
		const upload = config.attach?.upload;
		if (!upload || !list) return;
		for (const file of Array.from(list)) {
			const id = next.current++;
			setFiles((all) => [...all, { id, name: file.name }]);
			upload(file)
				.catch((e: unknown) => ({ error: e instanceof Error ? e.message : t.failed }))
				.then((r) => setFiles((all) => all.map((f) => (f.id === id ? { ...f, ...r } : f))));
		}
		if (picker.current) picker.current.value = '';
	};
	return (
		<form onSubmit={(e) => { e.preventDefault(); submit(); }}
			className={cn('rounded-2xl border bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/40', className)}>
			{files.length > 0 && (
				<ul className="flex flex-wrap gap-1.5 px-1.5 pt-1 pb-1.5" aria-live="polite">
					{files.map((f) => (
						<li key={f.id} className={cn('flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-xs', f.error ? 'border-destructive/50 text-destructive' : 'bg-muted/50')}>
							{f.note || f.error ? <FileText className="size-3.5 shrink-0" /> : <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-label={t.attaching} />}
							<span className="truncate" title={f.error ?? f.name}>{f.error ? `${f.name}: ${f.error}` : f.name}</span>
							<button type="button" aria-label={t.removeAttachment(f.name)} title={t.removeAttachment(f.name)} onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))}
								className="grid size-4 place-items-center rounded text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
						</li>
					))}
				</ul>
			)}
			<div className="flex items-end gap-2 pl-1.5">
				{config.attach ? (
					<>
						<input ref={picker} type="file" multiple hidden accept={config.attach.accept} onChange={(e) => attach(e.target.files)} />
						<IconButton label={t.attach} disabled={busy || !available} onClick={() => picker.current?.click()} className="rounded-full"><Paperclip /></IconButton>
					</>
				) : <span className="w-1.5" />}
				<textarea ref={field} autoFocus rows={1} value={text} maxLength={4000} aria-label={t.placeholder}
					placeholder={placeholder ?? t.placeholder}
					className={cn('max-h-[200px] min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground', compact && 'min-h-8 py-1.5')}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
				{busy ? (
					<IconButton label={t.stop} onClick={stop} className="rounded-full bg-secondary text-secondary-foreground"><Square className="fill-current" /></IconButton>
				) : (
					<button type="submit" disabled={!canSend} title={t.ask} aria-label={t.ask}
						className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40 [&_svg]:size-4"><ArrowUp /></button>
				)}
			</div>
		</form>
	);
}

/** Starter questions (only on an empty conversation). */
export function Suggestions({ questions, className }: { questions?: string[]; className?: string }) {
	const { send, busy, config } = useAgent();
	const list = questions ?? config.suggestions ?? [];
	if (!list.length) return null;
	return (
		<div className={cn('flex flex-wrap justify-center gap-2', className)}>
			{list.map((q) => (
				<button key={q} type="button" disabled={busy} onClick={() => send(q)}
					className="rounded-full border bg-card px-3 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent/50">{q}</button>
			))}
		</div>
	);
}

/** The compact conversation of the chat box: the thread, and the field below. */
export function CompactConversation({ emptyTitle }: { emptyTitle?: string }) {
	const { t } = useAgent();
	return (
		<Availability>
			<div className="flex min-h-0 flex-1 flex-col">
				<Thread compact empty={
					<div className="grid justify-items-center gap-3 px-3 py-6 text-center">
						<Avatar size={64} />
						<p className="text-base font-medium">{emptyTitle ?? t.emptyTitle}</p>
						<Suggestions />
					</div>
				} />
				<div className="border-t bg-card p-2"><Composer compact /></div>
			</div>
		</Availability>
	);
}
