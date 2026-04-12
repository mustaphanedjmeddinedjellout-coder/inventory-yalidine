/**
 * SocialProof — Subtle rating badge displayed near the product title.
 * Reinforces trust through perceived popularity.
 */

export default function SocialProof({ rating = 4.8, orders = 120 }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const totalStars = 5;

  return (
    <div className="social-proof">
      <span className="social-proof__stars" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: totalStars }, (_, i) => {
          if (i < fullStars) return <span key={i} className="social-proof__star social-proof__star--full">★</span>;
          if (i === fullStars && hasHalf) return <span key={i} className="social-proof__star social-proof__star--half">★</span>;
          return <span key={i} className="social-proof__star social-proof__star--empty">★</span>;
        })}
      </span>
      <span className="social-proof__text">
        ({rating}/5) – +{orders} commandes
      </span>
    </div>
  );
}
