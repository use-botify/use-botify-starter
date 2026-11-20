import localFont from "next/font/local"

const mono = localFont({
  src: [
    {
      path: "../fonts/mono-light.woff2",
      weight: "300",
    },
    {
      path: "../fonts/mono-regular.woff2",
      weight: "400",
    },
  ],
  variable: "--font-mono",
})

const inter = localFont({
  src: [
    {
      path: "../fonts/inter.woff2",
    },
  ],
  variable: "--font-inter",
  display: "swap",
})

export { inter, mono }
