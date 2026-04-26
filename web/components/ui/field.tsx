interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[10.5px] uppercase tracking-wider font-mono text-ink-3"
      >
        {label}
        {hint && <span className="text-ink-3 normal-case ml-2">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
