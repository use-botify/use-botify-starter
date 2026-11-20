import { cn } from "@/lib/utils"

export function MaxWidthWrapper({
  children,
  className,
}: React.ComponentProps<"main">) {
  return (
    <main className={cn("max-w-screen-2xl mx-auto relative", className)}>
      {children}
    </main>
  )
}
