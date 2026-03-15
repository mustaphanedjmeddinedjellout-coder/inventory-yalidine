export default function QuantityPicker({ value, onChange, min = 1, max = 99 }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-black/10">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-sm text-black/50 transition-colors hover:bg-black/5"
        onClick={dec}
      >
        -
      </button>
      <span className="flex h-9 min-w-10 items-center justify-center border-x border-black/10 px-3 text-[13px] font-semibold">
        {value}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-sm text-black/50 transition-colors hover:bg-black/5"
        onClick={inc}
      >
        +
      </button>
    </div>
  );
}
