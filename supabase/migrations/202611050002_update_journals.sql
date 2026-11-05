CREATE OR REPLACE FUNCTION public.update_journal(
  p_journal_id BIGINT,
  p_kos TEXT,
  p_post_date DATE,
  p_user_remark TEXT,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_journal public.journals%ROWTYPE;
  v_line JSONB;
  v_account_name TEXT;
  v_bank_id BIGINT;
  v_debit NUMERIC(18, 2);
  v_credit NUMERIC(18, 2);
  v_total_debit NUMERIC(18, 2) := 0;
  v_total_credit NUMERIC(18, 2) := 0;
  v_line_count INTEGER := 0;
BEGIN
  SELECT * INTO v_journal
  FROM public.journals
  WHERE id = p_journal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal not found';
  END IF;

  IF NULLIF(BTRIM(p_kos), '') IS NULL OR p_post_date IS NULL THEN
    RAISE EXCEPTION 'Kos and post date are required';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array'
     OR jsonb_array_length(p_lines) < 2 OR jsonb_array_length(p_lines) > 100 THEN
    RAISE EXCEPTION 'Journal must have between 2 and 100 lines';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_account_name := NULLIF(BTRIM(v_line->>'account_name'), '');
    v_debit := COALESCE(NULLIF(v_line->>'debit', '')::NUMERIC, 0);
    v_credit := COALESCE(NULLIF(v_line->>'credit', '')::NUMERIC, 0);

    IF v_account_name IS NULL OR v_debit < 0 OR v_credit < 0
       OR v_debit * 100 <> TRUNC(v_debit * 100)
       OR v_credit * 100 <> TRUNC(v_credit * 100)
       OR (v_debit > 0 AND v_credit > 0)
       OR (v_debit = 0 AND v_credit = 0) THEN
      RAISE EXCEPTION 'Invalid journal line';
    END IF;

    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
    v_line_count := v_line_count + 1;
  END LOOP;

  IF v_line_count < 2 OR v_total_debit <= 0 OR v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Journal debit and credit totals must be equal and greater than zero';
  END IF;

  UPDATE public.journals
  SET kos = BTRIM(p_kos),
      post_date = p_post_date,
      user_remark = COALESCE(p_user_remark, ''),
      total_debit = v_total_debit,
      total_credit = v_total_credit
  WHERE id = p_journal_id;

  DELETE FROM public.journal_lines WHERE journal_id = p_journal_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_bank_id := NULLIF(v_line->>'bank_id', '')::BIGINT;
    INSERT INTO public.journal_lines (
      journal_id, account_name, bank_id, line_remark, debit, credit
    )
    VALUES (
      p_journal_id,
      BTRIM(v_line->>'account_name'),
      v_bank_id,
      COALESCE(v_line->>'line_remark', ''),
      COALESCE(NULLIF(v_line->>'debit', '')::NUMERIC, 0),
      COALESCE(NULLIF(v_line->>'credit', '')::NUMERIC, 0)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_journal.id,
    'voucher_no', v_journal.voucher_no,
    'kos', BTRIM(p_kos),
    'post_date', p_post_date,
    'user_remark', COALESCE(p_user_remark, ''),
    'total_debit', v_total_debit,
    'total_credit', v_total_credit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_journal(BIGINT, TEXT, DATE, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_journal(BIGINT, TEXT, DATE, TEXT, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_journal(BIGINT, TEXT, DATE, TEXT, JSONB) TO service_role;
