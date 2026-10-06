import { addDoc, listDocs } from '@/lib/rag';

export async function GET() {
  return Response.json(await listDocs());
}

export async function POST(req: Request) {
  const { name, text } = (await req.json()) as { name?: string; text?: string };
  if (!name?.trim() || !text?.trim()) {
    return Response.json({ error: 'name and text are required' }, { status: 400 });
  }
  try {
    return Response.json(await addDoc(name.trim(), text), { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
