import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { attachmentFolder, storeAttachment } from './files.js';
import { createAgentGateway } from './gateway.js';

const caller = { tenant: 'Acme.com', person: 'Ana@Acme.com', role: 'member', name: 'Ana' };

function memoryBucket() {
	const put = new Map<string, { size: number; type?: string }>();
	const bucket = {
		put: async (key: string, body: ReadableStream, o?: { httpMetadata?: { contentType?: string } }) => {
			const bytes = await new Response(body).arrayBuffer();
			put.set(key, { size: bytes.byteLength, type: o?.httpMetadata?.contentType });
		},
	} as unknown as R2Bucket;
	return { bucket, put };
}

function upload(name: string, content = 'hello', type = 'application/pdf') {
	const form = new FormData();
	form.append('file', new File([content], name, { type }));
	return new Request('https://app/api/agent/files', { method: 'POST', body: form });
}

describe('attachments', () => {
	it('live in the caller folder', () => {
		expect(attachmentFolder(caller)).toBe('files/acme.com/ana@acme.com/');
	});

	it('are stored under that folder with a note for the agent', async () => {
		const { bucket, put } = memoryBucket();
		const res = await storeAttachment(upload('Relatório 2026.pdf'), bucket, caller);
		expect(res.status).toBe(201);
		const { key, note } = (await res.json()) as { key: string; note: string };
		expect(key).toMatch(/^files\/acme\.com\/ana@acme\.com\/[0-9a-f]{8}\/Relatório 2026\.pdf$/);
		expect(note).toContain(`file "${key}"`);
		expect(put.get(key)).toEqual({ size: 5, type: 'application/pdf' });
	});

	it('refuse other types and big files', async () => {
		const { bucket } = memoryBucket();
		expect((await storeAttachment(upload('run.exe'), bucket, caller)).status).toBe(415);
		expect((await storeAttachment(upload('a.pdf', 'x'.repeat(11)), bucket, caller, { maxBytes: 10 })).status).toBe(413);
	});

	it('go through the gateway only for a signed-in caller', async () => {
		const { bucket, put } = memoryBucket();
		const gateway = (signedIn: boolean) =>
			new Hono().route('/api/agent', createAgentGateway({ agent: () => undefined, identify: () => (signedIn ? caller : null), files: { bucket: () => bucket } }));
		expect((await gateway(false).fetch(upload('a.pdf'))).status).toBe(401);
		expect((await gateway(true).fetch(upload('a.pdf'))).status).toBe(201);
		expect(put.size).toBe(1);
	});
});
