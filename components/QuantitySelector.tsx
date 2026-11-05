'use client';
export default function QuantitySelector({
  value,
  onChange,
  max = 99,
  min = 1,
  label = 'Quantity',
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
  label?: string;
}) {
  const clamp = (n: number) =>
    Math.max(min, Math.min(max, Math.trunc(n) || min));
  return (
    <div className="quantity">
      <button
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </button>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <button
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
    </div>
  );
}
