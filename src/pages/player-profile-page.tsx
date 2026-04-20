import { type FormEvent, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Edit3, Flame, Goal, Star, Users } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { EmptyState } from "@/components/empty-state"
import { MediaUpload } from "@/components/media-upload"
import { PlayerAvatar } from "@/components/player-avatar"
import { StatCard } from "@/components/stat-card"
import { useAsyncData } from "@/hooks/use-async-data"
import { getPlayerProfile, updatePlayer } from "@/lib/data"
import { formatAverage, formatShortDate } from "@/lib/format"
import type { PlayerProfile } from "@/lib/types"

export function PlayerProfilePage() {
  const { playerId } = useParams()
  const { data, error, loading, reload } = useAsyncData(
    () => getPlayerProfile(playerId ?? ""),
    [playerId]
  )
  const [editOpen, setEditOpen] = useState(false)

  if (!playerId) {
    return <EmptyState title="Jugador inválido" description="Volvé al listado y elegí un jugador." />
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-muted" />
  }

  if (error || !data) {
    return <EmptyState title="No se pudo cargar el perfil" description={error ?? "Sin datos."} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="w-fit">
          <Link to="/jugadores">
            <ArrowLeft data-icon="inline-start" />
            Volver
          </Link>
        </Button>
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Edit3 data-icon="inline-start" />
              Editar
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Editar jugador</SheetTitle>
              <SheetDescription>Actualiza nombre, posición y foto.</SheetDescription>
            </SheetHeader>
            <EditPlayerForm
              player={data.profile}
              onSaved={async () => {
                setEditOpen(false)
                await reload()
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      <section className="overflow-hidden rounded-[2rem] border bg-primary text-primary-foreground">
        <div className="pitch-pattern p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <PlayerAvatar player={data.profile} className="size-20 border-4 border-primary-foreground/25" />
              <div>
                <Badge className="mb-2 bg-accent text-accent-foreground hover:bg-accent">
                  {data.profile.posicion ?? "Sin posición"}
                </Badge>
                <h1 className="text-4xl font-black tracking-tight">
                  {data.profile.apodo ?? data.profile.nombre}
                </h1>
                <p className="text-primary-foreground/75">{data.profile.nombre}</p>
              </div>
            </div>
            <p className="text-5xl font-black tracking-tighter">{data.profile.puntos} pts</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Partidos" value={data.profile.partidos_jugados} />
        <StatCard title="Goles" value={data.profile.goles} />
        <StatCard title="Asistencias" value={data.profile.asistencias} />
        <StatCard title="Promedio" value={formatAverage(data.profile.promedio_calificacion)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Premios y racha</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Award icon={Star} label="MVPs" value={data.profile.mvp_count} />
            <Award icon={Goal} label="Goles de la fecha" value={data.profile.gol_fecha_count} />
            <Award icon={Flame} label="Participación" value={data.profile.partidos_jugados} />
          </CardContent>
        </Card>

        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.history.length ? (
              data.history.map((item) => <HistoryRow key={String(item.id)} item={item} />)
            ) : (
              <EmptyState title="Sin partidos" description="Todavía no participó en ningún partido." />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function EditPlayerForm({
  player,
  onSaved,
}: {
  player: PlayerProfile
  onSaved: () => Promise<void>
}) {
  const [photoUrl, setPhotoUrl] = useState(player.foto_url ?? "")
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await updatePlayer(player.id, {
        nombre: String(form.get("nombre") ?? ""),
        apodo: String(form.get("apodo") ?? ""),
        posicion: String(form.get("posicion") ?? ""),
        foto_url: photoUrl,
      })
      toast.success("Jugador actualizado.")
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-nombre">Nombre</FieldLabel>
            <Input id="edit-nombre" name="nombre" defaultValue={player.nombre} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-apodo">Apodo</FieldLabel>
            <Input id="edit-apodo" name="apodo" defaultValue={player.apodo ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-posicion">Posición</FieldLabel>
            <Input id="edit-posicion" name="posicion" defaultValue={player.posicion ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-foto">Foto URL</FieldLabel>
            <Input
              id="edit-foto"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              placeholder="https://..."
            />
          </Field>
          <MediaUpload
            folder="players"
            accept="image/png,image/jpeg,image/webp"
            onUploaded={setPhotoUrl}
          />
          <Button disabled={pending}>Guardar cambios</Button>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}

function Award({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/70 p-4">
      <div className="flex items-center gap-3">
        <Icon />
        <span className="font-semibold">{label}</span>
      </div>
      <span className="text-2xl font-black">{value}</span>
    </div>
  )
}

function HistoryRow({ item }: { item: Record<string, unknown> }) {
  const match = item.matches as
    | {
        fecha: string
        equipo_a_score: number
        equipo_b_score: number
        estado: string
      }
    | undefined

  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border bg-background/70 p-4">
      <div>
        <p className="font-bold">{match ? formatShortDate(match.fecha) : "Partido"}</p>
        <p className="text-sm text-muted-foreground">
          Equipo {String(item.equipo)} · {String(item.goles)} goles ·{" "}
          {String(item.asistencias)} asist.
        </p>
      </div>
      <Badge variant="secondary">
        {match ? `${match.equipo_a_score}-${match.equipo_b_score}` : "S/R"}
      </Badge>
    </div>
  )
}
