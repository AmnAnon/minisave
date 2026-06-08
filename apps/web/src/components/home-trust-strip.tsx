export function HomeTrustStrip() {
  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-3">
      <div>
        <div className="text-sm font-medium text-zinc-100">Confirmed onchain</div>
        <p className="mt-2 text-sm text-zinc-400">Success states appear only after confirmed receipts.</p>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-100">Penalty reserve</div>
        <p className="mt-2 text-sm text-zinc-400">Early exit penalties route into a separate reserve contract.</p>
      </div>
      <div>
        <div className="text-sm font-medium text-zinc-100">Chain aware</div>
        <p className="mt-2 text-sm text-zinc-400">Writes stay guarded against the wrong network.</p>
      </div>
    </section>
  );
}
