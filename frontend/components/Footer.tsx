export function Footer() {
  return (
    <footer className="mt-8 border-t border-ink-700 py-4 text-center">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <div className="mono text-xs text-slate-400 tracking-widest">
          PROTOTYPE BUILT FOR SIH26054 · TEAM IGNITE ·{' '}
          <span className="text-cyan">AEROTWIN-AI</span> ·{' '}
          <span className="hidden md:inline">
            Data: NASA C-MAPSS Turbofan Engine Degradation Dataset ·{' '}
          </span>
          MoD / DRDO
        </div>
      </div>
    </footer>
  );
}
