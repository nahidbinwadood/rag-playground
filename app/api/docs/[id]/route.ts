import { deleteDoc } from '@/lib/rag';

export async function DELETE(_req: Request, ctx: RouteContext<'/api/docs/[id]'>) {
  const { id } = await ctx.params;
  await deleteDoc(id);
  return new Response(null, { status: 204 });
}
