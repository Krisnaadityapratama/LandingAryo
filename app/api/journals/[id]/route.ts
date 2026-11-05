import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { parseJournalInput } from '@/lib/journals';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return NextResponse.json({ error: 'ID journal tidak valid.' }, { status: 400 });
  }

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

  const { data, error } = await supabase.rpc('update_journal', {
    p_journal_id: Number(id),
    p_kos: parsed.value.kos,
    p_post_date: parsed.value.post_date,
    p_user_remark: parsed.value.user_remark,
    p_lines: parsed.value.lines,
  });

  if (error) {
    console.error('PUT /journals/[id] error:', error);
    if (error.message.includes('Journal not found')) {
      return NextResponse.json({ error: 'Journal tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Journal gagal diperbarui. Periksa kembali data dan konfigurasi database.' },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return NextResponse.json({ error: 'ID journal tidak valid.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('journals')
    .delete()
    .eq('id', Number(id))
    .select('id, voucher_no')
    .maybeSingle();

  if (error) {
    console.error('DELETE /journals/[id] error:', error);
    return NextResponse.json({ error: 'Journal gagal dihapus.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Journal tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, voucher_no: data.voucher_no });
}
