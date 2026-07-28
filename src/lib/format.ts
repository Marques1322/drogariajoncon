/**
 * Shared formatting helpers (pt-BR) used across the ERP.
 * Keep runtime pure — no side effects, safe to import anywhere.
 */

const BRL_FMT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUMBER_FMT = new Intl.NumberFormat("pt-BR");

const DATE_FMT = new Intl.DateTimeFormat("pt-BR");

const DATETIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Format a number as Brazilian Real currency. `null`/`undefined`/`NaN` → "R$ 0,00". */
export function brl(n: number | string | null | undefined): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return BRL_FMT.format(Number.isFinite(v) ? v : 0);
}

/** Format a plain integer/float in pt-BR (grouping, no currency). */
export function num(n: number | string | null | undefined): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return NUMBER_FMT.format(Number.isFinite(v) ? v : 0);
}

/**
 * Format a date/ISO string as `dd/mm/yyyy`. Accepts Date, ISO string,
 * or `null`/`undefined` (returns `"—"`).
 */
export function dateBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

/** Format a date+time as `dd/mm/yyyy HH:MM`. */
export function dateTimeBR(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d);
}

/** Compute margin (%) from cost/sale prices. Returns `null` when undefined. */
export function margin(
  cost: number | null | undefined,
  sale: number | null | undefined,
): number | null {
  const c = Number(cost ?? 0);
  const s = Number(sale ?? 0);
  if (!s) return null;
  return ((s - c) / s) * 100;
}
