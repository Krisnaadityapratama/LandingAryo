import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/auth';

const normalizeAboutTitle = (value: unknown): string => {
  if (Array.isArray(value)) {
    const roles = value.map((item) => String(item).trim()).filter(Boolean);
    return JSON.stringify(roles);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const roles = parsed.map((item) => String(item).trim()).filter(Boolean);
        return JSON.stringify(roles);
      }
    } catch {
      // keep it as plain string for backwards compatibility
    }

    return trimmed;
  }

  return '';
};

// GET — public
export async function GET() {
  const { data, error } = await supabase
    .from('general')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // Default empty values (no null to prevent React errors)
    return NextResponse.json({
      status_note: '',
      about_name: '',
      about_title: '',
      about_description: '',
      contact_email: '',
      contact_linkedin: '',
      contact_whatsapp: '',
      about_image_url: '',
    });
  }
  
  // Normalize null to empty string
  return NextResponse.json({
    ...data,
    status_note: data.status_note ?? '',
    about_name: data.about_name ?? '',
    about_title: normalizeAboutTitle(data.about_title),
    about_description: data.about_description ?? '',
    contact_email: data.contact_email ?? '',
    contact_linkedin: data.contact_linkedin ?? '',
    contact_whatsapp: data.contact_whatsapp ?? '',
    about_image_url: data.about_image_url ?? '',
  });
}

// PUT — admin only
export async function PUT(request: NextRequest) {
  const authError = await verifyAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  
  const { data, error } = await supabase
    .from('general')
    .update({
      status_note: body.status_note ?? '',
      about_name: body.about_name ?? '',
      about_title: normalizeAboutTitle(body.about_title),
      about_description: body.about_description ?? '',
      contact_email: body.contact_email ?? '',
      contact_linkedin: body.contact_linkedin ?? '',
      contact_whatsapp: body.contact_whatsapp ?? '',
      about_image_url: body.about_image_url ?? '',
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    ...data,
    status_note: data.status_note ?? '',
    about_name: data.about_name ?? '',
    about_title: normalizeAboutTitle(data.about_title),
    about_description: data.about_description ?? '',
    contact_email: data.contact_email ?? '',
    contact_linkedin: data.contact_linkedin ?? '',
    contact_whatsapp: data.contact_whatsapp ?? '',
    about_image_url: data.about_image_url ?? '',
  });
}
