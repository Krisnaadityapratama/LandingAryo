import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'ID bank tidak valid.' }, { status: 400 });
  }

  const { error } = await supabase.from('banks').delete().eq('id', id);
  if (error) {
    console.error('DELETE /journals/banks error:', error);
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Bank sudah dipakai pada journal dan tidak dapat dihapus.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Bank gagal dihapus.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
