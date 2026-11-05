import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabase
    .from('banks')
    .select('id, name, account_number, account_holder')
    .order('name', { ascending: true });

  if (error) {
    console.error('GET /journals/banks error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar bank.' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  let body: { name?: unknown; account_number?: unknown; account_holder?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid.' }, { status: 400 });
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Nama bank wajib diisi.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('banks')
    .insert({
      name: body.name.trim(),
      account_number:
        typeof body.account_number === 'string' ? body.account_number.trim() : '',
      account_holder:
        typeof body.account_holder === 'string' ? body.account_holder.trim() : '',
    })
    .select('id, name, account_number, account_holder')
    .single();

  if (error) {
    console.error('POST /journals/banks error:', error);
    return NextResponse.json({ error: 'Bank gagal ditambahkan.' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
