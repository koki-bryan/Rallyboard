export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full bg-white ${compact ? 'size-7' : 'size-[35px]'}`} aria-hidden="true">
      <img
        src="/assets/rallyboard.png"
        alt=""
        className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 ${compact ? 'size-14' : 'size-[70px]'}`}
      />
    </span>
  );
}
