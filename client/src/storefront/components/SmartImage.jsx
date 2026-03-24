import { useEffect, useRef, useState } from 'react';

const PLACEHOLDER_IMAGE = '/placeholder-product.svg';

export default function SmartImage({
  src,
  alt,
  className,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
}) {
  const [currentSrc, setCurrentSrc] = useState(src || PLACEHOLDER_IMAGE);
  const [hasRetried, setHasRetried] = useState(false);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    setCurrentSrc(src || PLACEHOLDER_IMAGE);
    setHasRetried(false);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [src]);

  const handleError = () => {
    if (!src) {
      setCurrentSrc(PLACEHOLDER_IMAGE);
      return;
    }

    if (!hasRetried) {
      setHasRetried(true);
      retryTimerRef.current = setTimeout(() => {
        const join = src.includes('?') ? '&' : '?';
        setCurrentSrc(`${src}${join}retry=1`);
      }, 250);
      return;
    }

    setCurrentSrc(PLACEHOLDER_IMAGE);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      onError={handleError}
    />
  );
}
