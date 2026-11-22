export function Background() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 flex h-36 w-full items-center justify-center"
      >
        <div className="h-36 w-sm transform rounded-full bg-linear-to-tl from-slate-800 via-green-500 to-zinc-400 blur-[150px]" />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 left-0 z-0 h-full"
        style={{
          width: "100%",
          height: "100%",
          backgroundSize: "109px",
          backgroundRepeat: "repeat",
          backgroundImage:
            'url("https://framerusercontent.com/images/rR6HYXBrMmX4cRpXfXUOvpvpB0.png")',
          opacity: 0.06,
          borderRadius: "0px",
        }}
      />
    </>
  )
}
