type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
};

function localDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63")) return digits.slice(2).slice(0, 10);
  if (digits.startsWith("0")) return digits.slice(1).slice(0, 10);
  return digits.slice(0, 10);
}

export default function PhilippinePhoneField({ value, onChange, label = "Phone number", error, disabled = false }: Props) {
  const local = localDigits(value);

  return <div>
    <label className="mb-1.5 block text-xs font-[600] text-[var(--color-ink)]">{label}</label>
    <div className={`flex items-center rounded-sm border bg-white transition-all ${error ? "border-[var(--color-red)]" : "border-[var(--color-border)] focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10"}`}>
      <span className="select-none border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-ink-muted)]">+63</span>
      <input type="tel" inputMode="numeric" value={local} disabled={disabled}
        onChange={event => onChange(`+63${event.target.value.replace(/\D/g, "").slice(0, 10)}`)}
        placeholder="917 555 0182" aria-invalid={Boolean(error)}
        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-[var(--color-ink-disabled)] disabled:bg-[var(--color-surface)]" />
    </div>
    {error ? <p className="mt-1 text-xs text-[var(--color-red)]">{error}</p> : <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Enter the 10-digit mobile number after +63.</p>}
  </div>;
}
