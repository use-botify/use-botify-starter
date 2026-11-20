import ReactLenis from "lenis/react";

import { Background } from "@/components/background";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ReactLenis root>
      <Background />
      <MaxWidthWrapper>
        <SiteHeader />
        {children}
        <SiteFooter />
      </MaxWidthWrapper>
    </ReactLenis>
  );
}
