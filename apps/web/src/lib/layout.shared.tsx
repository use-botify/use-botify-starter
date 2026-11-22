import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-mono font-semibold">
          <svg
            viewBox="0 0 5844 5869"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            aria-hidden="true"
            className="size-5 shrink-0"
          >
            <g>
              <path d="M0.5,3494.499c0,1241.961 0,1216.732 0,1216.732l1159.469,1152.618l1187.5,3.025l-0.534,-1161.664l-1168.635,2.459l8.366,-1211.875l-1186.167,-1.295Z" />
              <path d="M25.988,2373.297c0,-1241.961 0,-1216.732 0,-1216.732l1159.469,-1152.618l1187.5,-3.025l-0.534,1161.664l-1168.635,-2.459l8.366,1211.875l-1186.167,1.295Z" />
              <path d="M5842.898,2372.875c0,-1241.961 0,-1216.732 0,-1216.732l-1159.469,-1152.618l-1187.5,-3.025l0.534,1161.664l1168.635,-2.459l-8.366,1211.875l1186.167,1.295Z" />
              <path d="M5817.713,3495.953c0,1241.961 0,1216.732 0,1216.732l-1159.469,1152.618l-1187.5,3.025l0.534,-1161.664l1168.635,2.459l-8.366,-1211.875l1186.167,-1.295Z" />
              <path d="M1633.965,2899.463l1291.473,-1288.855l1292.417,1289.715l-1298.735,1301.901l-1285.154,-1302.761Z" />
            </g>
          </svg>
          Use Botify
        </span>
      ),
    },
    githubUrl: "https://github.com/use-botify/use-botify-starter",
    links: [
      {
        text: "Home",
        url: "/",
      },
      {
        text: "npm",
        url: "https://www.npmjs.com/package/create-use-botify",
        external: true,
      },
    ],
  }
}
