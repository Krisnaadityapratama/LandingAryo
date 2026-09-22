import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

// GET — public (all services with gallery)
export async function GET() {
  const { data, error } = await supabase
    .from('services')
    .select('*, gallery:service_gallery(*), property_details:service_property_details(*), property_rooms:service_property_rooms(*)')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('GET /services error:', error);
    return NextResponse.json([]);
  }
  return NextResponse.json(data ?? []);
}

// POST — admin only
export async function POST(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const body = await request.json();

  if (!body.subject || !body.name || !body.category || !body.description) {
    return NextResponse.json(
      { error: 'Missing required fields (subject, name, category, description)' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('services')
    .insert({
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
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
