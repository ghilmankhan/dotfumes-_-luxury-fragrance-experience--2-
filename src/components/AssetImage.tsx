import type { ImgHTMLAttributes } from 'react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { imageFocalClasses } from '../styles/tokens/imageTokens';
import type { ImageFocalPoint } from '../styles/tokens/imageTokens';

interface AssetImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  imgClassName?: string;
  blurDataClassName?: string;
  focal?: ImageFocalPoint;
}

export const AssetImage = ({
  src,
  alt,
  className,
  imgClassName,
  wrapperClassName,
  blurDataClassName,
  focal = 'center',
  style,
  ...props
}: AssetImageProps) => {
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>();
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;
  const loading = props.loading ?? (props.fetchPriority === 'high' ? 'eager' : 'lazy');

  return (
    <div className={cn('relative overflow-hidden bg-surface-glass-subtle', wrapperClassName)}>
      <div
        aria-hidden="true"
        className={cn(
          'asset-shimmer absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none',
          (loaded || failed) && 'opacity-0',
          blurDataClassName,
        )}
      />

      {failed ? (
        <div className="relative z-1 flex h-full w-full items-center justify-center bg-neutral-100 px-4 text-center text-caption uppercase tracking-wide text-neutral-500">
          image unavailable
        </div>
      ) : null}

      <img
        {...props}
        src={src}
        alt={alt}
        loading={loading}
        decoding={props.decoding ?? 'async'}
        style={style}
        onLoad={(event) => {
          setLoadedSrc(src);
          setFailedSrc(undefined);
          props.onLoad?.(event);
        }}
        onError={(event) => {
          setLoadedSrc(undefined);
          setFailedSrc(src);
          props.onError?.(event);
        }}
        className={cn(
          'asset-image-transition relative z-1 transition-opacity transition-transform ease-out motion-reduce:scale-100 motion-reduce:blur-none motion-reduce:transition-none',
          imageFocalClasses[focal],
          loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-100 blur-xl scale-105',
          failed && 'hidden',
          className,
          imgClassName,
        )}
      />
    </div>
  );
};
