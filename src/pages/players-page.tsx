import { type FormEvent, useState } from "react"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useAsyncData } from "@/hooks/use-async-data"
import { POSITIONS } from "@/lib/domain"
import { createPlayer, getPlayers } from "@/lib/data"
import { formatAverage } from "@/lib/format"

export function PlayersPage() {
  const { data: players, error, loading, reload } = useAsyncData(getPlayers, [])
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Plantel
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Jugadores</h1>
          <p className="text-muted-foreground">Alta, perfil, foto y estadisticas acumuladas.</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus data-icon="inline-start" />
              Nuevo jugador
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader className="p-6 pb-2">
              <SheetTitle>Alta de jugador</SheetTitle>
              <SheetDescription>Se guarda directo en Supabase.</SheetDescription>
            </SheetHeader>
            <PlayerForm
              onSaved={async () => {
                setOpen(false)
                await reload()
              }}
            />
          </SheetContent>
        </Sheet>
      </div>

      {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
      {loading ? <div className="h-64 animate-pulse rounded-3xl bg-muted" /> : null}

      {!loading && players?.length === 0 ? (
        <EmptyState title="No hay jugadores" description="Crea el primer jugador para armar equipos." />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {players?.map((player) => (
          <Link key={player.id} to={`/jugadores/${player.id}`}>
            <Card className="h-full bg-card/86 transition hover:-translate-y-0.5 hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-3">
                <PlayerAvatar player={player} className="size-14" />
                <div className="min-w-0">
                  <CardTitle className="truncate">{player.apodo ?? player.nombre}</CardTitle>
                  <CardDescription className="truncate">
                    {player.nombre} · {player.posicion ?? "Sin posicion"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-2 text-center">
                <MiniStat label="Pts" value={player.puntos} />
                <MiniStat label="G" value={player.goles} />
                <MiniStat label="A" value={player.asistencias} />
                <MiniStat label="Prom" value={formatAverage(player.promedio_calificacion)} />
                {player.mvp_count ? (
                  <Badge className="col-span-2 bg-accent text-accent-foreground hover:bg-accent">
                    {player.mvp_count} MVP
                  </Badge>
                ) : null}
                {player.gol_fecha_count ? (
                  <Badge variant="secondary" className="col-span-2">
                    {player.gol_fecha_count} gol fecha
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}

function PlayerForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [photoUrl, setPhotoUrl] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await createPlayer({
        nombre: String(form.get("nombre") ?? ""),
        apodo: String(form.get("apodo") ?? ""),
        posicion: String(form.get("posicion") ?? ""),
        foto_url: photoUrl,
      })
      toast.success("Jugador creado.")
      setPhotoUrl("")
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el jugador.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2" autoComplete="off">
      <FieldSet>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
            <Input
              id="nombre"
              name="nombre"
              required
              minLength={2}
              autoComplete="off"
              placeholder="Nico Gonzalez"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apodo">Apodo</FieldLabel>
            <Input id="apodo" name="apodo" autoComplete="off" placeholder="El Tanque" />
          </Field>
          <Field>
            <FieldLabel>Posicion</FieldLabel>
            <Select name="posicion">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegir posicion" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="foto_url">Foto URL</FieldLabel>
            <Input
              id="foto_url"
              type="url"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
              autoComplete="off"
              placeholder="https://..."
            />
            <MediaUpload
              folder="players"
              accept="image/png,image/jpeg,image/webp"
              onUploaded={setPhotoUrl}
            />
          </Field>
          <div className="rounded-2xl border bg-muted/50 p-4 text-sm text-muted-foreground">
            Podes pegar una URL de foto o subir una imagen directo a Supabase Storage.
          </div>
          <Button disabled={pending} className="h-11 w-full">
            Crear jugador
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/70 p-2">
      <p className="text-lg font-black">{value}</p>
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  )
}
