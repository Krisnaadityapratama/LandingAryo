import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';
import { parseJournalInput } from '@/lib/journals';

export async function GET(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabase
    .from('journals')
    .select('*, journal_lines(*)')
    .order('post_date', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('GET /journals error:', error);
    return NextResponse.json({ error: 'Gagal memuat journal.' }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid.' }, { status: 400 });
  }

  const parsed = parseJournalInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('create_journal', {
    p_kos: parsed.value.kos,
    p_post_date: parsed.value.post_date,
    p_user_remark: parsed.value.user_remark,
    p_lines: parsed.value.lines,
  });

  if (error) {
    console.error('POST /journals error:', error);
    return NextResponse.json(
      { error: 'Journal gagal disimpan. Periksa kembali data dan konfigurasi database.' },
      { status: 500 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
