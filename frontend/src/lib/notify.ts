import { toast } from "@/components/ui/use-toast"

export const notify = {
  success(title: string, description?: string) {
    toast({ title, description })
  },
  error(title: string, description?: string) {
    toast({ title, description, variant: "destructive" })
  },
}