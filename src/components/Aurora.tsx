export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--aurora-violet)] opacity-30 blur-[120px] animate-aurora" />
      <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[var(--aurora-cyan)] opacity-25 blur-[140px] animate-aurora" style={{ animationDelay: "-6s" }} />
      <div className="absolute -bottom-40 left-1/3 h-[440px] w-[440px] rounded-full bg-[var(--aurora-pink)] opacity-20 blur-[140px] animate-aurora" style={{ animationDelay: "-12s" }} />
    </div>
  );
}
