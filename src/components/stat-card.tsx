import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
  title: string
  value: ReactNode
  detail?: string
  className?: string
}

export function StatCard({ title, value, detail, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border/70 bg-card/86 shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="text-2xl font-black tracking-tight sm:text-3xl">{value}</div>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  )
}
