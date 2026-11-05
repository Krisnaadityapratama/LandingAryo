"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

interface Bank {
  id: number;
  name: string;
  account_number: string;
  account_holder: string;
}

interface JournalLine {
  id?: number;
  account_name: string;
  bank_id: number | null;
  line_remark: string;
  debit: number;
  credit: number;
}

interface Journal {
  id: number;
  voucher_no: string;
  kos: string;
  post_date: string;
  user_remark: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
  journal_lines: JournalLine[];
}

interface JournalDraftLine {
  account_name: string;
  bank_id: string;
  line_remark: string;
  debit: string;
  credit: string;
}

const EMPTY_LINE: JournalDraftLine = {
  account_name: "",
  bank_id: "",
  line_remark: "",
  debit: "",
  credit: "",
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function localDateValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function JournalAdmin() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [savedVoucher, setSavedVoucher] = useState("");
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showBankManager, setShowBankManager] = useState(false);
  const [expandedJournal, setExpandedJournal] = useState<number | null>(null);
  const [editingJournalId, setEditingJournalId] = useState<number | null>(null);
  const [savingJournal, setSavingJournal] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [kos, setKos] = useState("");
  const [postDate, setPostDate] = useState(localDateValue);
  const [userRemark, setUserRemark] = useState("");
  const [lines, setLines] = useState<JournalDraftLine[]>([
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ]);
  const [bankName, setBankName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  const loadData = useCallback(async () => {
    const [journalResponse, bankResponse] = await Promise.all([
      fetch("/api/journals"),
      fetch("/api/journals/banks"),
    ]);

    if (!journalResponse.ok || !bankResponse.ok) {
      throw new Error("Gagal memuat data journal dan bank.");
    }

    const [journalData, bankData] = await Promise.all([
      journalResponse.json(),
      bankResponse.json(),
    ]);
    setJournals(journalData);
    setBanks(bankData);
  }, []);

  useEffect(() => {
    const request = Promise.resolve().then(loadData);
    request
      .catch((error: unknown) => {
        setPageError(error instanceof Error ? error.message : "Gagal memuat data.");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (sum, line) => ({
          debit: sum.debit + (Number(line.debit) || 0),
          credit: sum.credit + (Number(line.credit) || 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [lines],
  );
  const isBalanced =
    totals.debit > 0 && Math.abs(totals.debit - totals.credit) < 0.005;

  const resetJournalForm = () => {
    setEditingJournalId(null);
    setKos("");
    setPostDate(localDateValue());
    setUserRemark("");
    setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    setFormError("");
  };

  const editJournal = (journal: Journal) => {
    setEditingJournalId(journal.id);
    setKos(journal.kos);
    setPostDate(journal.post_date);
    setUserRemark(journal.user_remark);
    setLines(
      journal.journal_lines.map((line) => ({
        account_name: line.account_name,
        bank_id: line.bank_id === null ? "" : String(line.bank_id),
        line_remark: line.line_remark,
        debit: String(line.debit),
        credit: String(line.credit),
      })),
    );
    setFormError("");
    setShowJournalForm(true);
  };

  const updateLine = (
    index: number,
    field: keyof JournalDraftLine,
    value: string,
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const saveJournal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!isBalanced) {
      setFormError("Total debit dan kredit harus sama dan lebih dari nol.");
      return;
    }
    if (lines.some((line) => !line.account_name.trim())) {
      setFormError("Nama akun wajib diisi untuk setiap baris journal.");
      return;
    }

    setSavingJournal(true);
    try {
      const response = await fetch(
        editingJournalId
          ? `/api/journals/${editingJournalId}`
          : "/api/journals",
        {
          method: editingJournalId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kos,
            post_date: postDate,
            user_remark: userRemark,
            lines: lines.map((line) => ({
              account_name: line.account_name.trim(),
              bank_id: line.bank_id ? Number(line.bank_id) : null,
              line_remark: line.line_remark.trim(),
              debit: Number(line.debit) || 0,
              credit: Number(line.credit) || 0,
            })),
          }),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Journal gagal disimpan.");
      }

      setSavedVoucher(
        `${editingJournalId ? "Journal diperbarui" : "Journal tersimpan"}. Voucher: ${result.voucher_no}`,
      );
      setShowJournalForm(false);
      resetJournalForm();
      await loadData();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Journal gagal disimpan.",
      );
    } finally {
      setSavingJournal(false);
    }
  };

  const addBank = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingBank(true);
    setPageError("");
    try {
      const response = await fetch("/api/journals/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bankName,
          account_number: bankNumber,
          account_holder: bankHolder,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Bank gagal ditambahkan.");
      setBankName("");
      setBankNumber("");
      setBankHolder("");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Bank gagal ditambahkan.");
    } finally {
      setSavingBank(false);
    }
  };

  const deleteBank = async (bank: Bank) => {
    if (!confirm(`Hapus bank "${bank.name}" dari daftar?`)) return;
    setPageError("");
    try {
      const response = await fetch(`/api/journals/banks/${bank.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Bank gagal dihapus.");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Bank gagal dihapus.");
    }
  };

  const deleteJournal = async (journal: Journal) => {
    if (!confirm(`Hapus journal ${journal.voucher_no}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setPageError("");
    try {
      const response = await fetch(`/api/journals/${journal.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Journal gagal dihapus.");
      }

      if (expandedJournal === journal.id) setExpandedJournal(null);
      setSavedVoucher(`Journal ${result.voucher_no} berhasil dihapus.`);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Journal gagal dihapus.");
    }
  };

  return (
    <div className="p-6 lg:p-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-brand-yellow">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Keuangan Kos
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Journal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat transaksi dan pantau voucher journal kos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowBankManager(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            <Building2 className="h-4 w-4" />
            Daftar Bank
          </button>
          <button
            onClick={() => {
              resetJournalForm();
              setShowJournalForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-bold text-[#030c17] transition-colors hover:bg-brand-yellow-dark"
          >
            <Plus className="h-4 w-4" />
            Input Journal
          </button>
        </div>
      </div>

      {savedVoucher && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <Check className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <span className="font-bold tracking-wide">{savedVoucher}</span>
          </p>
          <button
            onClick={() => setSavedVoucher("")}
            className="ml-auto rounded-lg p-1 text-emerald-300/70 hover:bg-emerald-500/10 hover:text-emerald-200"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pageError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {pageError}
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#0a1729] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Voucher</p>
          <p className="mt-2 text-2xl font-bold text-white">{journals.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0a1729] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank Terdaftar</p>
          <p className="mt-2 text-2xl font-bold text-white">{banks.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0a1729] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Voucher Terbaru</p>
          <p className="mt-2 truncate text-lg font-bold text-brand-yellow">
            {journals[0]?.voucher_no ?? "-"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1729]/70">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">Riwayat Journal</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Memuat journal...</div>
        ) : journals.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-slate-300">Belum ada journal.</p>
            <p className="mt-1 text-sm text-slate-500">Mulai dengan tombol Input Journal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Voucher / Post Date</th>
                  <th className="px-5 py-3 font-semibold">Kos</th>
                  <th className="px-5 py-3 font-semibold">User Remark</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {journals.map((journal) => (
                  <JournalRow
                    key={journal.id}
                    journal={journal}
                    banks={banks}
                    expanded={expandedJournal === journal.id}
                    onEdit={() => editJournal(journal)}
                    onDelete={() => deleteJournal(journal)}
                    onToggle={() =>
                      setExpandedJournal((current) =>
                        current === journal.id ? null : journal.id,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showJournalForm && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowJournalForm(false);
              setEditingJournalId(null);
            }}
            aria-label="Tutup form journal"
          />
          <form
            onSubmit={saveJournal}
            className="relative my-6 w-full max-w-4xl rounded-2xl border border-slate-700 bg-[#0a1729] p-5 shadow-2xl sm:p-7"
          >
            <button
              type="button"
              onClick={() => {
                setShowJournalForm(false);
                setEditingJournalId(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="mb-1 text-xl font-bold text-white">
              {editingJournalId ? "Edit Journal" : "Input Journal"}
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              {editingJournalId
                ? "Perbarui data journal. Nomor voucher tetap sama."
                : "Voucher dibuat otomatis setelah journal berhasil disimpan."}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Kos
                <input
                  required
                  value={kos}
                  onChange={(event) => setKos(event.target.value)}
                  placeholder="Nama kos"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Post Date
                <span className="relative mt-2 block">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    required
                    type="date"
                    value={postDate}
                    onChange={(event) => setPostDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-3 pl-10 pr-4 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                  />
                </span>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:col-span-2">
                User Remark
                <textarea
                  value={userRemark}
                  onChange={(event) => setUserRemark(event.target.value)}
                  rows={2}
                  placeholder="Catatan umum journal"
                  className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                />
              </label>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">Journal Entries</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Isi debit dan kredit hingga jumlahnya seimbang.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:grid-cols-12"
                >
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-3">
                    Akun
                    <input
                      required
                      value={line.account_name}
                      onChange={(event) => updateLine(index, "account_name", event.target.value)}
                      placeholder="Nama akun"
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                    />
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-3">
                    Bank (opsional)
                    <select
                      value={line.bank_id}
                      onChange={(event) => updateLine(index, "bank_id", event.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                    >
                      <option value="">Tanpa bank</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}{bank.account_number ? ` - ${bank.account_number}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-2">
                    Debit
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={line.debit}
                      onChange={(event) => updateLine(index, "debit", event.target.value)}
                      placeholder="0"
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                    />
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-2">
                    Kredit
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={line.credit}
                      onChange={(event) => updateLine(index, "credit", event.target.value)}
                      placeholder="0"
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                    />
                  </label>
                  <div className="flex items-end sm:col-span-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) =>
                          current.length > 2
                            ? current.filter((_, lineIndex) => lineIndex !== index)
                            : current,
                        )
                      }
                      disabled={lines.length <= 2}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2.5 text-xs text-slate-400 hover:border-red-500/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Hapus baris ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  </div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-12">
                    Keterangan Baris
                    <input
                      value={line.line_remark}
                      onChange={(event) => updateLine(index, "line_remark", event.target.value)}
                      placeholder="Opsional"
                      className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-x-6 gap-y-2 rounded-xl bg-slate-900/70 p-4 text-sm">
              <span className="text-slate-400">
                Debit <strong className="ml-2 text-white">{formatAmount(totals.debit)}</strong>
              </span>
              <span className="text-slate-400">
                Kredit <strong className="ml-2 text-white">{formatAmount(totals.credit)}</strong>
              </span>
              <span className={isBalanced ? "text-emerald-400" : "text-amber-400"}>
                {isBalanced ? "Seimbang" : "Belum seimbang"}
              </span>
            </div>
            {formError && (
              <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {formError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowJournalForm(false);
                  setEditingJournalId(null);
                }}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingJournal || !isBalanced}
                className="flex items-center gap-2 rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-bold text-[#030c17] hover:bg-brand-yellow-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingJournal
                  ? "Menyimpan..."
                  : editingJournalId
                    ? "Simpan Perubahan"
                    : "Simpan Journal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showBankManager && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <button
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowBankManager(false)}
            aria-label="Tutup daftar bank"
          />
          <div className="relative my-6 w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0a1729] p-5 shadow-2xl sm:p-7">
            <button
              onClick={() => setShowBankManager(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold text-white">Daftar Bank</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Bank yang ditambahkan tersedia sebagai pilihan saat input journal.
            </p>
            <form onSubmit={addBank} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-3">
              <input
                required
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                placeholder="Nama bank"
                aria-label="Nama bank"
                className="rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-yellow"
              />
              <input
                value={bankNumber}
                onChange={(event) => setBankNumber(event.target.value)}
                placeholder="Nomor rekening"
                aria-label="Nomor rekening"
                className="rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-yellow"
              />
              <div className="flex gap-2">
                <input
                  value={bankHolder}
                  onChange={(event) => setBankHolder(event.target.value)}
                  placeholder="Nama pemilik"
                  aria-label="Nama pemilik rekening"
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-yellow"
                />
                <button
                  disabled={savingBank}
                  className="rounded-lg bg-brand-yellow px-3 text-[#030c17] disabled:opacity-50"
                  aria-label="Simpan bank"
                >
                  {savingBank ? "..." : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </form>
            <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto">
              {banks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada bank.</p>
              ) : banks.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{bank.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {[bank.account_number, bank.account_holder].filter(Boolean).join(" · ") || "Detail rekening belum diisi"}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBank(bank)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                    aria-label={`Hapus ${bank.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JournalRow({
  journal,
  banks,
  expanded,
  onEdit,
  onDelete,
  onToggle,
}: {
  journal: Journal;
  banks: Bank[];
  expanded: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const banksById = new Map(banks.map((bank) => [bank.id, bank]));
  return (
    <>
      <tr className="cursor-pointer text-slate-300 transition-colors hover:bg-slate-800/30" onClick={onToggle}>
        <td className="px-5 py-4">
          <p className="font-semibold text-brand-yellow">{journal.voucher_no}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3" />
            {new Date(`${journal.post_date}T00:00:00`).toLocaleDateString("id-ID")}
          </p>
        </td>
        <td className="px-5 py-4 font-medium text-white">{journal.kos}</td>
        <td className="max-w-[260px] px-5 py-4 text-slate-400">
          <span className="block truncate">{journal.user_remark || "-"}</span>
        </td>
        <td className="px-5 py-4 text-right font-medium text-white">
          {formatAmount(Number(journal.total_debit))}
        </td>
        <td className="px-5 py-4 text-right text-slate-500">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-brand-yellow"
              aria-label={`Edit voucher ${journal.voucher_no}`}
              title="Edit journal"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
              aria-label={`Hapus voucher ${journal.voucher_no}`}
              title="Hapus journal"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-slate-900/40 px-5 py-4">
            <div className="mb-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">User Remark:</span>{" "}
              {journal.user_remark || "-"}
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full min-w-[580px] text-left text-xs">
                <thead className="bg-slate-900 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Akun</th>
                    <th className="px-3 py-2">Bank</th>
                    <th className="px-3 py-2">Keterangan</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {journal.journal_lines.map((line, index) => (
                    <tr key={line.id ?? index} className="text-slate-300">
                      <td className="px-3 py-2.5">{line.account_name}</td>
                      <td className="px-3 py-2.5">
                        {line.bank_id ? banksById.get(line.bank_id)?.name ?? "Bank dihapus" : "-"}
                      </td>
                      <td className="px-3 py-2.5">{line.line_remark || "-"}</td>
                      <td className="px-3 py-2.5 text-right">{formatAmount(Number(line.debit))}</td>
                      <td className="px-3 py-2.5 text-right">{formatAmount(Number(line.credit))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-700 bg-slate-900/70 font-semibold text-white">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-right">Total</td>
                    <td className="px-3 py-2.5 text-right">{formatAmount(Number(journal.total_debit))}</td>
                    <td className="px-3 py-2.5 text-right">{formatAmount(Number(journal.total_credit))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
