import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowedOrigins = new Set([
  'https://qbao0111.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function setCors(request: VercelRequest, response: VercelResponse) {
  const origin = request.headers.origin;
  if (typeof origin === 'string' && (allowedOrigins.has(origin) || origin.endsWith('.vercel.app'))) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-QB-Sync-Code');
  response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  response.setHeader('Cache-Control', 'no-store');
}

function getWorkspaceHash(request: VercelRequest) {
  const rawCode = request.headers['x-qb-sync-code'];
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  if (!code || code.length < 8 || code.length > 128) return null;
  return createHash('sha256').update(code.normalize('NFKC')).digest('hex');
}

function parseBody(body: unknown) {
  if (typeof body === 'string') return JSON.parse(body) as unknown;
  return body;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setCors(request, response);

  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'GET' && request.method !== 'PUT') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const workspaceHash = getWorkspaceHash(request);
  if (!workspaceHash) {
    return response.status(401).json({ error: 'Mã đồng bộ phải có từ 8 đến 128 ký tự.' });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return response.status(503).json({ error: 'Database chưa được cấu hình.' });
  }

  try {
    const sql = neon(connectionString);
    await sql`
      CREATE TABLE IF NOT EXISTS qb_sync_workspaces (
        workspace_hash TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        revision BIGINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    if (request.method === 'GET') {
      const rows = await sql`
        SELECT payload, revision, updated_at
        FROM qb_sync_workspaces
        WHERE workspace_hash = ${workspaceHash}
      `;
      const row = rows[0];
      if (!row) return response.status(200).json({ revision: 0, snapshot: null });
      return response.status(200).json({
        revision: Number(row.revision),
        snapshot: row.payload,
        updatedAt: row.updated_at,
      });
    }

    const body = parseBody(request.body) as {
      baseRevision?: unknown;
      snapshot?: unknown;
    };
    const baseRevision = Number(body?.baseRevision);
    const snapshot = body?.snapshot as { banks?: unknown; activeBankId?: unknown } | undefined;

    if (
      !Number.isSafeInteger(baseRevision) ||
      baseRevision < 0 ||
      !snapshot ||
      !Array.isArray(snapshot.banks) ||
      !(typeof snapshot.activeBankId === 'string' || snapshot.activeBankId === null)
    ) {
      return response.status(400).json({ error: 'Dữ liệu đồng bộ không hợp lệ.' });
    }

    const payload = JSON.stringify(snapshot);
    if (Buffer.byteLength(payload, 'utf8') > 12_000_000) {
      return response.status(413).json({ error: 'Dữ liệu quá lớn để đồng bộ trong một lần.' });
    }

    const rows = await sql`
      INSERT INTO qb_sync_workspaces (workspace_hash, payload, revision, updated_at)
      VALUES (${workspaceHash}, ${payload}::jsonb, 1, NOW())
      ON CONFLICT (workspace_hash) DO UPDATE
      SET payload = EXCLUDED.payload,
          revision = qb_sync_workspaces.revision + 1,
          updated_at = NOW()
      WHERE qb_sync_workspaces.revision = ${baseRevision}
      RETURNING revision, updated_at
    `;

    if (rows[0]) {
      return response.status(200).json({
        revision: Number(rows[0].revision),
        updatedAt: rows[0].updated_at,
      });
    }

    const latest = await sql`
      SELECT payload, revision, updated_at
      FROM qb_sync_workspaces
      WHERE workspace_hash = ${workspaceHash}
    `;
    return response.status(409).json({
      error: 'Dữ liệu đã thay đổi trên thiết bị khác.',
      revision: Number(latest[0]?.revision ?? 0),
      snapshot: latest[0]?.payload ?? null,
      updatedAt: latest[0]?.updated_at ?? null,
    });
  } catch (error) {
    console.error('QB sync error', error);
    return response.status(500).json({ error: 'Không thể đồng bộ với Neon.' });
  }
}
