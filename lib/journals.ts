export interface JournalInputLine {
  account_name: string;
  bank_id: number | null;
  line_remark: string;
  debit: number;
  credit: number;
}

export interface JournalInput {
  kos: string;
  post_date: string;
  user_remark: string;
  lines: JournalInputLine[];
}

export function parseJournalInput(body: unknown):
  | { error: string }
  | { value: JournalInput } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body tidak valid.' };
  }

  const input = body as Record<string, unknown>;
  if (
    typeof input.kos !== 'string' ||
    !input.kos.trim() ||
    typeof input.post_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.post_date) ||
    !Array.isArray(input.lines) ||
    input.lines.length < 2 ||
    input.lines.length > 100
  ) {
    return {
      error: 'Kos, post date, dan minimal dua baris journal wajib diisi.',
    };
  }

  const lines: JournalInputLine[] = [];
  for (const rawLine of input.lines) {
    if (!rawLine || typeof rawLine !== 'object' || Array.isArray(rawLine)) {
      return { error: 'Baris journal tidak valid.' };
    }

    const line = rawLine as Record<string, unknown>;
    const accountName =
      typeof line.account_name === 'string' ? line.account_name.trim() : '';
    const debit = Number(line.debit);
    const credit = Number(line.credit);
    const bankId =
      line.bank_id === null || line.bank_id === '' || line.bank_id === undefined
        ? null
        : Number(line.bank_id);

    if (
      !accountName ||
      !Number.isFinite(debit) ||
      !Number.isFinite(credit) ||
      debit < 0 ||
      credit < 0 ||
      Math.abs(debit * 100 - Math.round(debit * 100)) >= 0.000001 ||
      Math.abs(credit * 100 - Math.round(credit * 100)) >= 0.000001 ||
      (debit > 0 && credit > 0) ||
      (debit === 0 && credit === 0) ||
      (bankId !== null && (!Number.isSafeInteger(bankId) || bankId <= 0))
    ) {
      return {
        error: 'Setiap baris harus memiliki akun dan hanya mengisi debit atau kredit.',
      };
    }

    lines.push({
      account_name: accountName,
      bank_id: bankId,
      line_remark:
        typeof line.line_remark === 'string' ? line.line_remark.trim() : '',
      debit,
      credit,
    });
  }

  const totalDebit = lines.reduce((total, line) => total + line.debit, 0);
  const totalCredit = lines.reduce((total, line) => total + line.credit, 0);
  if (totalDebit <= 0 || Math.abs(totalDebit - totalCredit) >= 0.005) {
    return {
      error: 'Total debit dan kredit harus sama dan lebih dari nol.',
    };
  }

  return {
    value: {
      kos: input.kos.trim(),
      post_date: input.post_date,
      user_remark:
        typeof input.user_remark === 'string' ? input.user_remark.trim() : '',
      lines,
    },
  };
}
