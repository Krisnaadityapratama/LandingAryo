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
  FileDown,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { autoTable, RowInput } from "jspdf-autotable";

interface Bank {
  id: number;
  name: string;
  account_number: string;
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

function formatJournalDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID");
}

export default function JournalAdmin() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

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
  const invalidPeriod = Boolean(startDate && endDate && startDate > endDate);
  const filteredJournals = useMemo(
    () =>
      invalidPeriod
        ? []
        : journals.filter(
            (journal) =>
              (!startDate || journal.post_date >= startDate) &&
              (!endDate || journal.post_date <= endDate),
          ),
    [endDate, invalidPeriod, journals, startDate],
  );

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
          name: accountName,
          account_number: accountNumber,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Account gagal ditambahkan.");
      setAccountName("");
      setAccountNumber("");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Account gagal ditambahkan.");
    } finally {
      setSavingBank(false);
    }
  };

  const deleteBank = async (bank: Bank) => {
    if (!confirm(`Hapus account "${bank.name}" dari Account List?`)) return;
    setPageError("");
    try {
      const response = await fetch(`/api/journals/banks/${bank.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Account gagal dihapus.");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Account gagal dihapus.");
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

  const exportJournalsToPdf = () => {
    if (invalidPeriod || filteredJournals.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const banksById = new Map(banks.map((bank) => [bank.id, bank.name]));
    const body: RowInput[] = [];

    for (const journal of filteredJournals) {
      for (const line of journal.journal_lines) {
        body.push([
          journal.voucher_no,
          formatJournalDate(journal.post_date),
          journal.kos,
          journal.user_remark || "-",
          line.account_name,
          line.bank_id ? banksById.get(line.bank_id) ?? "Bank dihapus" : "-",
          line.line_remark || "-",
          formatAmount(Number(line.debit)),
          formatAmount(Number(line.credit)),
        ]);
      }

      body.push([
        {
          content: `Total ${journal.voucher_no}`,
          colSpan: 7,
          styles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "right",
          },
        },
        {
          content: formatAmount(Number(journal.total_debit)),
          styles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "right",
          },
        },
        {
          content: formatAmount(Number(journal.total_credit)),
          styles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "right",
          },
        },
      ]);
    }

    const periodTotals = filteredJournals.reduce(
      (totals, journal) => ({
        debit: totals.debit + Number(journal.total_debit),
        credit: totals.credit + Number(journal.total_credit),
      }),
      { debit: 0, credit: 0 },
    );
    body.push([
      {
        content: "TOTAL KESELURUHAN PERIODE",
        colSpan: 7,
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: formatAmount(periodTotals.debit),
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: formatAmount(periodTotals.credit),
        styles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "right",
        },
      },
    ]);

    const periodStart = startDate ? formatJournalDate(startDate) : "Tidak dibatasi";
    const periodEnd = endDate ? formatJournalDate(endDate) : "Tidak dibatasi";
    doc.setFontSize(16);
    doc.text("Laporan Journal", 8, 12);
    doc.setFontSize(9);
    doc.text(`Periode: ${periodStart} - ${periodEnd}`, 8, 19);
    doc.text(`Jumlah voucher: ${filteredJournals.length}`, 8, 24);

    autoTable(doc, {
      startY: 29,
      head: [[
        "Voucher",
        "Tanggal",
        "Kos",
        "Catatan Journal",
        "Akun",
        "Bank",
        "Keterangan Baris",
        "Debit",
        "Kredit",
      ]],
      body,
      theme: "grid",
      margin: { left: 8, right: 8 },
      styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 20 },
        2: { cellWidth: 24 },
        3: { cellWidth: 34 },
        4: { cellWidth: 27 },
        5: { cellWidth: 24 },
        6: { cellWidth: 42 },
        7: { cellWidth: 36, halign: "right" },
        8: { cellWidth: 36, halign: "right" },
      },
    });

    const dateSuffix = (value: string) => value || "all";
    doc.save(`journal-${dateSuffix(startDate)}-to-${dateSuffix(endDate)}.pdf`);
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
            Account List
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
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Voucher Periode</p>
          <p className="mt-2 text-2xl font-bold text-white">{filteredJournals.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0a1729] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank Terdaftar</p>
          <p className="mt-2 text-2xl font-bold text-white">{banks.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0a1729] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Voucher Terbaru</p>
          <p className="mt-2 truncate text-lg font-bold text-brand-yellow">
            {filteredJournals[0]?.voucher_no ?? "-"}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-[#0a1729]/70 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tanggal Mulai
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 block rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tanggal Akhir
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 block rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-brand-yellow"
            />
          </label>
          {invalidPeriod && (
            <p role="alert" className="text-sm text-red-300 sm:col-span-2">
              Tanggal Mulai tidak boleh melewati Tanggal Akhir.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={exportJournalsToPdf}
          disabled={loading || invalidPeriod || filteredJournals.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-yellow hover:text-brand-yellow disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileDown className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a1729]/70">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">Riwayat Journal</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Memuat journal...</div>
        ) : filteredJournals.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-slate-300">Data Journal tidak tersedia untuk periode yang dipilih.</p>
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
                {filteredJournals.map((journal) => (
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
            aria-label="Tutup Account List"
          />
          <div className="relative my-6 w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0a1729] p-5 shadow-2xl sm:p-7">
            <button
              onClick={() => setShowBankManager(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold text-white">Account List</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">
              Account yang ditambahkan tersedia sebagai pilihan saat input journal.
            </p>
            <form onSubmit={addBank} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <input
                required
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Nama Account"
                aria-label="Nama Account"
                className="rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-yellow"
              />
              <input
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="Nomor Account"
                aria-label="Nomor Account"
                className="rounded-lg border border-slate-700 bg-[#030c17] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-yellow"
              />
              <button
                disabled={savingBank}
                className="flex items-center justify-center rounded-lg bg-brand-yellow px-3 text-[#030c17] disabled:opacity-50"
                aria-label="Simpan account"
              >
                {savingBank ? "..." : <Plus className="h-4 w-4" />}
              </button>
            </form>
            <div className="mt-4 max-h-[45vh] overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Nomor Account</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Nama Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {banks.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                        Belum ada account.
                      </td>
                    </tr>
                  ) : banks.map((bank) => (
                    <tr key={bank.id} className="text-slate-200">
                      <td className="px-4 py-3">{bank.account_number || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate font-medium text-white">{bank.name}</span>
                          <button
                            onClick={() => deleteBank(bank)}
                            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                            aria-label={`Hapus ${bank.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
