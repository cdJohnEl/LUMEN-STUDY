// Flat study illustration: stacked books with a graduation cap.
export default function StudyArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" className={className} role="img" aria-label="Stack of books with a graduation cap">
      <ellipse cx="116" cy="186" rx="86" ry="8" fill="#14142B" opacity=".08" />
      <path d="M150 40c26-30 60-8 56 34-3 30-38 40-60 18" fill="#C9DCD2" />
      <path d="M170 60c18-18 30 4 24 26" fill="none" stroke="#9FBFAE" strokeWidth="3" />
      <rect x="38" y="140" width="160" height="34" rx="9" fill="#F7B84B" />
      <rect x="48" y="150" width="130" height="8" rx="4" fill="#FFD98A" />
      <rect x="30" y="108" width="150" height="32" rx="9" fill="#8FD3B6" />
      <rect x="42" y="118" width="116" height="8" rx="4" fill="#C3EBD9" />
      <rect x="46" y="78" width="138" height="30" rx="9" fill="#9C8DF6" />
      <rect x="58" y="87" width="100" height="8" rx="4" fill="#CFC6FF" />
      <path d="M115 26 62 48l53 22 53-22z" fill="#14142B" />
      <path d="M84 58v18c0 8 14 14 31 14s31-6 31-14V58l-31 13z" fill="#2B2B52" />
      <path d="M168 48v26" stroke="#F7B84B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="168" cy="78" r="5" fill="#F7B84B" />
    </svg>
  );
}
