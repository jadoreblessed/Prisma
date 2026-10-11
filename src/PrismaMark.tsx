export default function PrismaMark() {
  return <svg viewBox="-100 -100 200 200" fill="none" aria-hidden="true">
    <path d="M0-87 20-22 86 0 20 22 0 87-20 22-86 0-20-22Z" fill="currentColor"/>
    <path d="M0-87 20-22 0 0-20-22Z" fill="currentColor" opacity=".72"/>
    <path d="M86 0 20 22 0 0 20-22Z" fill="currentColor" opacity=".84"/>
    <path d="M0 87-20 22 0 0 20 22Z" fill="currentColor" opacity=".68"/>
    <path d="M-86 0-20-22 0 0-20 22Z" fill="currentColor" opacity=".78"/>
    <path d="M0-16 16 0 0 16-16 0Z" className="prisma-mark-core"/>
  </svg>;
}
