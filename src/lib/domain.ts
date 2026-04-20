export const POINTS = {
  attendance: 1,
  goal: 2,
  assist: 1,
  mvp: 5,
  goalOfTheWeek: 3,
} as const

export const PRIZES = [
  { place: "1°", reward: "$100.000" },
  { place: "2°", reward: "$50.000" },
  { place: "3° a 5°", reward: "Remera" },
] as const

export const DEFAULT_CONTRIBUTION = 1000

export const POSITIONS = [
  "Arquero",
  "Defensor",
  "Mediocampista",
  "Delantero",
  "Comodín",
] as const

export const ROUTES = [
  { href: "/", label: "Inicio" },
  { href: "/partidos", label: "Partidos" },
  { href: "/votacion", label: "Votación" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/stats", label: "Stats" },
  { href: "/fondo", label: "Fondo" },
  { href: "/admin", label: "Admin" },
  { href: "/configuracion", label: "Config" },
  { href: "/publico", label: "Público" },
] as const

export function scoreLabel(a: number, b: number) {
  return `${a} - ${b}`
}

export function playerLabel(player: { nombre: string; apodo?: string | null }) {
  return player.apodo ? `${player.nombre} "${player.apodo}"` : player.nombre
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return
  }

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? ""
          return `"${String(value).replaceAll('"', '""')}"`
        })
        .join(",")
    ),
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function whatsappUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function mailtoUrl(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
