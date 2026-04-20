import { type ChangeEvent, useState } from "react"
import { UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadPlayerMedia } from "@/lib/data"

type MediaUploadProps = {
  folder: "players" | "goals"
  accept: string
  onUploaded: (url: string) => void
}

export function MediaUpload({ folder, accept, onUploaded }: MediaUploadProps) {
  const [pending, setPending] = useState(false)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setPending(true)

    try {
      const url = await uploadPlayerMedia(file, folder)
      onUploaded(url)
      toast.success("Archivo subido a Supabase Storage.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo.")
    } finally {
      setPending(false)
      event.target.value = ""
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input type="file" accept={accept} onChange={handleFile} disabled={pending} />
      <Button type="button" variant="outline" disabled={pending}>
        <UploadCloud data-icon="inline-start" />
        {pending ? "Subiendo" : "Subir"}
      </Button>
    </div>
  )
}
