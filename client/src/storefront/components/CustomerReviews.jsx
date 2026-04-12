/**
 * CustomerReviews — Auto-scrolling carousel of customer review media.
 * Supports images, GIFs, and looping videos with lazy loading.
 * Swipeable on mobile, auto-advances every 4 seconds.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Replace these placeholders with your actual media.
 * Each entry: { type: 'image' | 'video', src: '/path/to/file', alt?: string }
 */
const REVIEW_MEDIA = [
  { type: 'image', src: '/reviews/review-1.webp', alt: 'Avis client 1' },
  { type: 'image', src: '/reviews/review-2.webp', alt: 'Avis client 2' },
  { type: 'image', src: '/reviews/review-3.webp', alt: 'Avis client 3' },
  { type: 'image', src: '/reviews/review-4.webp', alt: 'Avis client 4' },
  { type: 'image', src: '/reviews/review-5.webp', alt: 'Avis client 5' },
  { type: 'image', src: '/reviews/review-6.webp', alt: 'Avis client 6' },
];

const AUTO_INTERVAL = 4000;
const SWIPE_THRESHOLD = 40;

export default function CustomerReviews({ media = REVIEW_MEDIA }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchRef = useRef({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const total = media.length;

  const goTo = useCallback(
    (index) => {
      setActive((index + total) % total);
    },
    [total],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, next, total]);

  // Touch handlers
  function onTouchStart(e) {
    const t = e.touches?.[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY };
    setPaused(true);
  }

  function onTouchEnd(e) {
    const t = e.changedTouches?.[0];
    if (!t) {
      setPaused(false);
      return;
    }
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? next() : prev();
    }
    setPaused(false);
  }

  if (!total) return null;

  // Show 1 on mobile, 3 on desktop via CSS grid
  return (
    <section className="reviews-section">
      <div className="reviews-header">
        <p className="reviews-label">ما يقوله عملاؤنا</p>
        <h2 className="reviews-title">آراء العملاء</h2>
      </div>

      <div
        className="reviews-carousel"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="reviews-track"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {media.map((item, idx) => (
            <div key={idx} className="reviews-slide">
              <div className="reviews-media-wrapper">
                {item.type === 'video' ? (
                  <video
                    src={item.src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    loading="lazy"
                    className="reviews-media"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={item.alt || `Avis client ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="reviews-media"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous review"
              onClick={prev}
              className="reviews-nav reviews-nav--prev"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next review"
              onClick={next}
              className="reviews-nav reviews-nav--next"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="reviews-dots">
          {media.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to review ${idx + 1}`}
              onClick={() => goTo(idx)}
              className={`reviews-dot ${idx === active ? 'reviews-dot--active' : ''}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
