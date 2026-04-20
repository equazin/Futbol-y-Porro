import type { ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type EmptyStateProps = {
  title: string
  description: ReactNode
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Alert className="border-dashed bg-card/70">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
}
