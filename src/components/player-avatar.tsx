import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/domain"
import type { Player } from "@/lib/types"

type PlayerAvatarProps = {
  player: Pick<Player, "nombre" | "foto_url">
  className?: string
}

export function PlayerAvatar({ player, className }: PlayerAvatarProps) {
  return (
    <Avatar className={className}>
      {player.foto_url ? <AvatarImage src={player.foto_url} alt={player.nombre} /> : null}
      <AvatarFallback>{initials(player.nombre)}</AvatarFallback>
    </Avatar>
  )
}
