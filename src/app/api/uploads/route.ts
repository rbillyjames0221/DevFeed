import { getCurrentUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).slice(0, 10);
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  return `${base || 'file'}${ext}`;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const originalName = file instanceof File ? file.name : 'upload';
    const cleanName = sanitizeFilename(originalName);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storedFilename = `${uniqueId}-${cleanName}`;

    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const targetPath = path.join(UPLOADS_DIR, storedFilename);
    await fs.promises.writeFile(targetPath, buffer);

    const fileType = file.type || 'application/octet-stream';
    const url = `/api/uploads/${storedFilename}`;

    return NextResponse.json({
      ok: true,
      url,
      name: originalName,
      size: file.size,
      type: fileType
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
