import { cn } from "@/lib/utils";

export type MedicineType = "comum" | "tarja-vermelha" | "tarja-preta" | "controlado";
export type StockStatus = "ok" | "baixo" | "critico" | "vencido" | "vencendo";

const medicineTypeConfig: Record<MedicineType, { label: string; className: string }> = {
  comum: {
    label: "Comum",
    className:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600",
  },
  "tarja-vermelha": {
    label: "Tarja Vermelha",
    className:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700 font-semibold",
  },
  "tarja-preta": {
    label: "Tarja Preta",
    className:
      "bg-slate-900 text-white border-slate-950 dark:bg-slate-950 dark:border-slate-800 font-semibold",
  },
  controlado: {
    label: "Controlado",
    className:
      "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700 font-semibold",
  },
};

const stockStatusConfig: Record<StockStatus, { label: string; className: string }> = {
  ok: {
    label: "Em estoque",
    className:
      "bg-success/10 text-success border-success/20 dark:bg-success/15 dark:text-success/90 dark:border-success/30",
  },
  baixo: {
    label: "Estoque baixo",
    className:
      "bg-warning/10 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning/90 dark:border-warning/30",
  },
  critico: {
    label: "Crítico",
    className:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700 font-semibold",
  },
  vencido: {
    label: "Vencido",
    className:
      "bg-danger/10 text-danger border-danger/20 dark:bg-danger/15 dark:text-danger/90 dark:border-danger/30 font-semibold",
  },
  vencendo: {
    label: "Vencendo",
    className:
      "bg-warning/10 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning/90 dark:border-warning/30 font-semibold",
  },
};

interface PharmacyBadgeProps {
  type: "medicine" | "stock";
  variant: MedicineType | StockStatus;
  className?: string;
  children?: React.ReactNode;
}

/**
 * PharmacyBadge - Semantic badge component for pharmacy ERPs
 *
 * Provides visual identification for:
 * - Medicine types: Comum, Tarja Vermelha, Tarja Preta, Controlado
 * - Stock status: OK, Baixo, Crítico, Vencido, Vencendo
 *
 * @example
 * <PharmacyBadge type="stock" variant="ok" />
 * <PharmacyBadge type="medicine" variant="tarja-vermelha">Tarja Vermelha</PharmacyBadge>
 */
export function PharmacyBadge({ type, variant, className, children }: PharmacyBadgeProps) {
  const config =
    type === "medicine"
      ? medicineTypeConfig[variant as MedicineType]
      : stockStatusConfig[variant as StockStatus];

  const label = children || config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
        config.className,
        className,
      )}
      role="status"
      aria-label={`${type === "medicine" ? "Tipo de medicamento" : "Status de estoque"}: ${label}`}
    >
      {label}
    </span>
  );
}
