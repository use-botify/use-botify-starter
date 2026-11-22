import ReactLenis from "lenis/react"

import { Background } from "@/components/background"
import { MaxWidthWrapper } from "@/components/max-width-wrapper"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ReactLenis root>
      <Background />
      <MaxWidthWrapper className="z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </MaxWidthWrapper>
    </ReactLenis>
  )
}
