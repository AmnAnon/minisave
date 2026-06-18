export function HomeTrustStrip() {
  return (
    <section className="grid gap-4 rounded-3xl border border-border bg-card/60 p-5 backdrop-blur-sm md:grid-cols-3">
      <div>
        <div className="text-sm font-medium text-foreground">Confirmed onchain</div>
        <p className="mt-2 text-sm text-muted-foreground">Success states appear only after confirmed receipts.</p>
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">Penalty reserve</div>
        <p className="mt-2 text-sm text-muted-foreground">Early exit penalties route into a separate reserve contract.</p>
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">Chain aware</div>
        <p className="mt-2 text-sm text-muted-foreground">Writes stay guarded against the wrong network.</p>
      </div>
    </section>
  );
}
