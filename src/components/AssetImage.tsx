import React from 'react';
import { cn } from '../lib/utils';

interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  imgClassName?: string;
  blurDataClassName?: string;
}

export const AssetImage: React.FC<AssetImageProps> = ({
  src,
  alt,
  className,
  imgClassName,
  wrapperClassName,
  blurDataClassName,
  style,
  ...props
}) => {
  const [loadedSrc, setLoadedSrc] = React.useState<string | undefined>();
  const [failedSrc, setFailedSrc] = React.useState<string | undefined>();
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;
  const loading = props.loading ?? (props.fetchPriority === 'high' ? 'eager' : 'lazy');

  return (
    <div className={cn('relative overflow-hidden bg-white/5', wrapperClassName)}>
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.05),rgba(255,255,255,0.12),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite] transition-opacity duration-700',
          (loaded || failed) && 'opacity-0',
          blurDataClassName,
        )}
      />

      {failed ? (
        <div className="relative z-[1] flex h-full w-full items-center justify-center bg-neutral-100 px-4 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-500">
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
          'relative z-[1] transition-[opacity,filter,transform] duration-[1600ms] ease-out',
          loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-100 blur-xl scale-[1.03]',
          failed && 'hidden',
          className,
          imgClassName,
        )}
      />
    </div>
  );
};
