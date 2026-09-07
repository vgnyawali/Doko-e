// Keep the supplied artwork unchanged and share sizing across brand placements.
export default function BrandLogo({ name = 'Doko' }: { name?: string }) {
  return (
    <a className="brand-logo" href="/" aria-label={`${name} home`}>
      <img src="/logo.png" alt={`${name} Nepali Market`} />
    </a>
  );
}
