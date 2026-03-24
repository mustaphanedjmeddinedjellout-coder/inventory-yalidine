import { useEffect, useRef, useState } from 'react';

const PLACEHOLDER_IMAGE = '/placeholder-product.svg';

export default function SmartImage({
  src,
  sources,
  alt,
  className,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  ...rest
}) {
  const sourceList = Array.isArray(sources)
    ? sources.filter(Boolean)
    : [src].filter(Boolean);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(sourceList[0] || PLACEHOLDER_IMAGE);
  const [hasRetried, setHasRetried] = useState(false);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    setSourceIndex(0);
    setCurrentSrc(sourceList[0] || PLACEHOLDER_IMAGE);
    setHasRetried(false);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [src, sources]);

  const handleError = () => {
    if (!currentSrc) {
      setCurrentSrc(PLACEHOLDER_IMAGE);
      return;
    }

    if (!hasRetried) {
      setHasRetried(true);
      retryTimerRef.current = setTimeout(() => {
        const join = currentSrc.includes('?') ? '&' : '?';
        setCurrentSrc(`${currentSrc}${join}retry=1`);
      }, 250);
      return;
    }

    const nextIndex = sourceIndex + 1;
    if (nextIndex < sourceList.length) {
      setSourceIndex(nextIndex);
      setCurrentSrc(sourceList[nextIndex]);
      setHasRetried(false);
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
      {...rest}
    />
  );
}
