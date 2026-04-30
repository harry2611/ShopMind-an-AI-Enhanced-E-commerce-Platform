import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function LazyImage({ src, alt, className }: Props) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '180px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={ref}
      src={visible ? src : undefined}
      alt={alt}
      loading="lazy"
      className={`${className ?? ''} bg-slate-100 object-cover transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
