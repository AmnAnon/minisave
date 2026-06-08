export function HomeHowItWorks() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {[
        ["Create vault", "Set a label, goal amount, and optional unlock date."],
        ["Deposit over time", "Fund the vault from portfolio using the configured stable token."],
        ["Unlock or exit early", "Withdraw cleanly after unlock, or exit early with a visible penalty."],
      ].map(([title, body]) => (
        <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-base font-medium text-zinc-100">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
        </div>
      ))}
    </section>
  );
}
