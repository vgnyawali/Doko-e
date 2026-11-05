// Keep the supplied artwork unchanged and share sizing across brand placements.
export default function BrandLogo({
  name = 'Doko',
  showName = false,
}: {
  name?: string;
  showName?: boolean;
}) {
  return (
    <a
      className={`brand-logo${showName ? ' brand-logo-with-name' : ''}`}
      href="/"
      aria-label={`${name} home`}
    >
      <img src="/logo.png" alt={`${name} Nepali Market`} />
      {showName && <span>{name}</span>}
    </a>
  );
}
