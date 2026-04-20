import { type FormEvent, useState } from "react"
import { LogOut, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-provider"
import { cn } from "@/lib/utils"

export function AuthPanel({ compact = false }: { compact?: boolean }) {
  const { user, loading, signInWithEmail, signOut } = useAuth()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error("Ingresa tu email para recibir el link.")
      return
    }

    setPending(true)

    try {
      await signInWithEmail(email)
      toast.success("Te enviamos el link de acceso.")
      setEmail("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesion.")
    } finally {
      setPending(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      toast.success("Sesion cerrada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar sesion.")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Verificando sesion...</p>
  }

  if (user) {
    return (
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className="hidden max-w-44 truncate text-sm text-muted-foreground sm:inline">
          {user.email}
        </span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut data-icon="inline-start" />
          Salir
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSignIn}
      className={cn(
        "flex w-full min-w-0 gap-2",
        compact ? "items-center" : "flex-col sm:ml-auto sm:max-w-sm sm:flex-row sm:items-center"
      )}
    >
      <FieldGroup className={compact ? "w-44 min-w-0 flex-1" : "w-full min-w-0 flex-1"}>
        <Field className="gap-1">
          <FieldLabel htmlFor="email" className="sr-only">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tu@email.com..."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Email para iniciar sesion"
            className="h-10 w-full min-w-0 rounded-full bg-background/80 px-4 shadow-sm"
          />
          <FieldDescription className="sr-only">Ingresa con magic link.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button
        size={compact ? "sm" : "lg"}
        disabled={pending}
        className={cn(
          compact ? "rounded-xl px-3 shadow-sm" : "h-10 w-full rounded-full px-4 shadow-sm sm:w-auto"
        )}
      >
        <Mail data-icon="inline-start" />
        {compact ? "Login" : "Entrar"}
      </Button>
    </form>
  )
}
