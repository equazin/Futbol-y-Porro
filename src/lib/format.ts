import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export function formatDate(value: string) {
  return format(parseISO(value), "EEEE d 'de' MMM", { locale: es })
}

export function formatShortDate(value: string) {
  return format(parseISO(value), "dd/MM/yyyy", { locale: es })
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number | null | undefined, fallback = "0") {
  return value == null ? fallback : value.toLocaleString("es-AR")
}

export function formatAverage(value: number | null | undefined) {
  return value == null ? "-" : Number(value).toFixed(1)
}
