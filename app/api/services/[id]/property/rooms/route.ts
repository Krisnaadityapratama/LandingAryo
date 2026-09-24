import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from('service_property_rooms')
    .select('*')
    .eq('service_id', id)
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

const normalizeDriveImageUrl = (value?: string) => {
  if (!value) return "";

  const trimmed = value.trim();
  const rawIdMatch = trimmed.match(/^([a-zA-Z0-9_-]{10,})$/);
  if (rawIdMatch) {
    return `https://drive.google.com/thumbnail?id=${rawIdMatch[1]}&sz=w1000`;
  }

  try {
    const parsed = new URL(trimmed);
    const id = parsed.searchParams.get("id") || parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1];
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
  } catch {
    // ignore invalid URL and fall back to regex extraction below
  }

  const match = trimmed.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{10,})/);
  if (!match) return trimmed;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
};

interface PropertyRoomPayload {
  room_number?: string;
  room_name?: string;
  status?: "available" | "booked" | "maintenance";
  image_url?: string;
  image_urls?: string[];
  note?: string;
  price?: string;
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await ctx.params;
  const body = await request.json();
  const rooms = Array.isArray(body?.rooms) ? body.rooms as PropertyRoomPayload[] : [];

  const { error: deleteError } = await supabase
    .from('service_property_rooms')
    .delete()
    .eq('service_id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (rooms.length === 0) {
    return NextResponse.json({ success: true, count: 0 });
  }

  const payload = rooms.map((room: PropertyRoomPayload, index: number) => {
    const imageUrls = [...(room.image_urls ?? []), ...(room.image_url ? [room.image_url] : [])]
      .map((url) => normalizeDriveImageUrl(url))
      .filter(Boolean);
    const uniqueImageUrls = [...new Set(imageUrls)];

    return {
      service_id: Number(id),
      room_number: String(room.room_number ?? `Room ${index + 1}`),
      room_name: room.room_name ?? '',
      status: room.status ?? 'available',
      image_url: uniqueImageUrls[0] ?? '',
      image_urls: uniqueImageUrls,
      note: room.note ?? '',
      price: room.price ?? '',
    };
  });

  const { data, error } = await supabase
    .from('service_property_rooms')
    .insert(payload)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: data?.length ?? 0 });
}
