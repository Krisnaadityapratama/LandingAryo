import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

interface Ctx { params: Promise<{ id: string }> }

// GET — public
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from('services')
    .select('*, gallery:service_gallery(*), property_details:service_property_details(*), property_rooms:service_property_rooms(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PUT — admin only
export async function PUT(request: NextRequest, ctx: Ctx) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const body = await request.json();

  if (!body.subject || !body.name || !body.category || !body.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('services')
    .update({
      subject: body.subject,
      name: body.name,
      category: body.category,
      description: body.description,
      detail_description: body.detail_description ?? '',
      icon: body.icon ?? 'Code2',
      hill_color: body.hill_color ?? '#65a30d',
      sky_grad: body.sky_grad ?? 'from-sky-100 to-sky-300',
      sheep_x: Number(body.sheep_x ?? 50),
      sheep_y: Number(body.sheep_y ?? 130),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE — admin only
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const { error } = await supabase.from('services').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
