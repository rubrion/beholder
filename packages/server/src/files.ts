// Files people attach in the chat. The gateway stores each one in the app's R2 bucket under
// the caller's own folder and returns the line that goes with the question; the agent
// worker's read_file reads only from that folder. No Mastra here: the gateway imports it.
import type { Caller } from './types.js';

/** What read_file converts (Workers AI toMarkdown). Pictures are left out: describing them is billed. */
export const DEFAULT_ACCEPT = ['.pdf', '.docx', '.xlsx', '.xlsm', '.xlsb', '.xls', '.ods', '.odt', '.csv', '.html', '.htm', '.xml', '.txt', '.md', '.json'];

export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9_.@-]/g, '');

/** The folder of one person's attachments. Conversations are private to tenant + person, so are their files. */
export function attachmentFolder(caller: Pick<Caller, 'tenant' | 'person'>): string {
	return `files/${slug(caller.tenant)}/${slug(caller.person)}/`;
}

function safeName(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? 'file';
	return base.replace(/[^\p{L}\p{N}._ -]/gu, '_').replace(/^\.+/, '').slice(0, 120) || 'file';
}

export interface FilesOptions {
	/** Extensions accepted, with the dot. Default: the documents read_file converts. */
	accept?: string[];
	/** Largest file accepted, in bytes. Default 20 MB. */
	maxBytes?: number;
}

/**
 * Stores one multipart `file` under the caller's folder and answers `{ key, note }`.
 * The note is the line the UI sends with the question: it tells the agent which file to read.
 */
export async function storeAttachment(request: Request, bucket: R2Bucket, caller: Caller, o: FilesOptions = {}): Promise<Response> {
	const accept = o.accept ?? DEFAULT_ACCEPT;
	const maxBytes = o.maxBytes ?? DEFAULT_MAX_BYTES;
	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return Response.json({ error: 'Send the file as multipart/form-data, field "file".' }, { status: 400 });
	}
	const file = form.get('file');
	if (!(file instanceof File) || !file.size) return Response.json({ error: 'No file.' }, { status: 400 });
	if (file.size > maxBytes) return Response.json({ error: `The file is over ${Math.round(maxBytes / 1024 / 1024)} MB.` }, { status: 413 });
	const name = safeName(file.name);
	const ext = `.${name.split('.').pop()?.toLowerCase()}`;
	if (!accept.includes(ext)) return Response.json({ error: `The assistant reads ${accept.join(' ')} files.` }, { status: 415 });

	const key = `${attachmentFolder(caller)}${crypto.randomUUID().slice(0, 8)}/${name}`;
	await bucket.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' }, customMetadata: { tenant: caller.tenant, person: caller.person } });
	return Response.json({ key, note: `Attached file: ${name} (read_file source "attachment", file "${key}")` }, { status: 201 });
}
