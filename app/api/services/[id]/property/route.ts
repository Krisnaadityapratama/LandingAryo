import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from('service_property_details')
    .select('*')
    .eq('service_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const body = await request.json();

  if (!body) {
    return NextResponse.json({ error: 'Property details are required' }, { status: 400 });
  }

  const payload = {
    service_id: Number(id),
    total_rooms: Number(body.total_rooms ?? 0),
    available_rooms: Number(body.available_rooms ?? 0),
    headline: body.headline ?? '',
    description: body.description ?? '',
    info_text: body.info_text ?? '',
  };

  const { data, error } = await supabase
    .from('service_property_details')
    .upsert(payload, { onConflict: 'service_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
