/**
 * TrustStrip — Inline trust indicators shown above the CTA button.
 * Addresses the three biggest trust blockers for Algerian e-commerce:
 * COD payment, nationwide delivery, and exchange policy.
 */

const TRUST_ITEMS = [
  {
    label: 'الدفع عند الاستلام',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M2 10h2M20 10h2M2 14h2M20 14h2" />
      </svg>
    ),
  },
  {
    label: 'توصيل إلى 58 ولاية',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: 'إمكانية الاستبدال',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <polyline points="23 20 23 14 17 14" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <div className="trust-strip">
      {TRUST_ITEMS.map((item) => (
        <div key={item.label} className="trust-strip__item">
          <span className="trust-strip__icon">{item.icon}</span>
          <span className="trust-strip__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
