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

export function AuthPanel() {
  const { user, loading, signInWithEmail, signOut } = useAuth()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error("Ingresá tu email para recibir el link.")
      return
    }

    setPending(true)

    try {
      await signInWithEmail(email)
      toast.success("Te enviamos el link de acceso.")
      setEmail("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesión.")
    } finally {
      setPending(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      toast.success("Sesión cerrada.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar sesión.")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Verificando sesión...</p>
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
      className="flex w-full min-w-0 flex-col gap-2 sm:ml-auto sm:max-w-sm sm:flex-row sm:items-center"
    >
      <FieldGroup className="w-full min-w-0 flex-1">
        <Field className="gap-1">
          <FieldLabel htmlFor="email" className="sr-only">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label="Email para iniciar sesión"
            className="h-10 w-full min-w-0 rounded-full bg-background/80 px-4 shadow-sm"
          />
          <FieldDescription className="sr-only">Ingresa con magic link.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button
        size="lg"
        disabled={pending}
        className="h-10 w-full rounded-full px-4 shadow-sm sm:w-auto"
      >
        <Mail data-icon="inline-start" />
        Entrar
      </Button>
    </form>
  )
}
