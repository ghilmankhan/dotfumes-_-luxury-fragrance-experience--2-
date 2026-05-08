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
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/5',
        wrapperClassName,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.05),rgba(255,255,255,0.12),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite] transition-opacity duration-700',
          loaded && 'opacity-0',
          blurDataClassName,
        )}
      />

      <img
        {...props}
        src={src}
        alt={alt}
        style={style}
        onLoad={(event) => {
          setLoaded(true);
          props.onLoad?.(event);
        }}
        className={cn(
          'relative z-[1] transition-[opacity,filter,transform] duration-[1600ms] ease-out',
          loaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-xl scale-[1.03]',
          className,
          imgClassName,
        )}
      />
    </div>
  );
};
