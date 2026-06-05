import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface Props {
  src?: string;
  alt: string;
  className?: string;
}

export function EventImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('flex aspect-video w-full items-center justify-center bg-muted', className)}
      >
        <ImageOff className="size-8 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('aspect-video w-full object-cover', className)}
    />
  );
}
