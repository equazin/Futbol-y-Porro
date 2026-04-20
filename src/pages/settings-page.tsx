import { type FormEvent, useState } from "react"
import { Mail, Save, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { useAsyncData } from "@/hooks/use-async-data"
import { getSettings, updateSetting } from "@/lib/data"
import { mailtoUrl, whatsappUrl } from "@/lib/domain"

function settingValue(settings: Awaited<ReturnType<typeof getSettings>>, key: string, fallback: string) {
  const value = settings.find((setting) => setting.key === key)?.value
  return value == null ? fallback : String(value)
}

export function SettingsPage() {
  const { data, error, loading, reload } = useAsyncData(getSettings, [])
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)

    try {
      await Promise.all([
        updateSetting("voting_window_hours", Number(form.get("voting_window_hours") ?? 48)),
        updateSetting("contribution_amount", Number(form.get("contribution_amount") ?? 1000)),
        updateSetting("prizes", {
          first: Number(form.get("first_prize") ?? 100000),
          second: Number(form.get("second_prize") ?? 50000),
          third_to_fifth: String(form.get("third_to_fifth") ?? "remera"),
        }),
      ])
      toast.success("Configuración guardada.")
      await reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.")
    } finally {
      setPending(false)
    }
  }

  const reminder =
    "Fútbol y Porro: confirmá asistencia para el domingo y acordate de votar MVP/Gol cuando abra la ventana."

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Config</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Ajustes de liga</h1>
          <p className="text-muted-foreground">Ventana de votación, aportes y premios sin tocar código.</p>
        </div>
        {loading ? <div className="h-72 animate-pulse rounded-3xl bg-muted" /> : null}
        {error ? <EmptyState title="No se pudo cargar" description={error} /> : null}
        {data ? (
          <Card className="bg-card/86">
            <CardHeader>
              <CardTitle>Reglas configurables</CardTitle>
              <CardDescription>Estos valores viven en `app_settings`.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldSet>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="voting_window_hours">Horas de votación</FieldLabel>
                      <Input
                        id="voting_window_hours"
                        name="voting_window_hours"
                        type="number"
                        min={1}
                        defaultValue={settingValue(data, "voting_window_hours", "48")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contribution_amount">Aporte por partido</FieldLabel>
                      <Input
                        id="contribution_amount"
                        name="contribution_amount"
                        type="number"
                        min={0}
                        defaultValue={settingValue(data, "contribution_amount", "1000")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="first_prize">Premio 1°</FieldLabel>
                      <Input id="first_prize" name="first_prize" type="number" min={0} defaultValue={100000} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="second_prize">Premio 2°</FieldLabel>
                      <Input id="second_prize" name="second_prize" type="number" min={0} defaultValue={50000} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="third_to_fifth">Premio 3° a 5°</FieldLabel>
                      <Input id="third_to_fifth" name="third_to_fifth" defaultValue="remera" />
                    </Field>
                    <Button disabled={pending}>
                      <Save data-icon="inline-start" />
                      Guardar ajustes
                    </Button>
                  </FieldGroup>
                </FieldSet>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Notificaciones rápidas</CardTitle>
            <CardDescription>Sin proveedor externo: abre WhatsApp o email con mensaje listo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild variant="outline">
              <a href={whatsappUrl(reminder)} target="_blank" rel="noreferrer">
                <Send data-icon="inline-start" />
                Enviar por WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={mailtoUrl("Fútbol y Porro", reminder)}>
                <Mail data-icon="inline-start" />
                Enviar por email
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-card/86">
          <CardHeader>
            <CardTitle>Primer admin</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Para habilitar administración, insertá tu `auth.users.id` en `app_admins` desde Supabase SQL Editor.
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
