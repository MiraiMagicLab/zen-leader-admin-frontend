import { BRAND } from '@/lib/brand/constants';

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export function BrandLogo({
  className,
  imageClassName,
  alt = `${BRAND.name} logo`,
}: BrandLogoProps) {
  return (
    <div className={className}>
      <picture>
        <source srcSet={BRAND.logoPath} type="image/webp" />
        <img
          src={BRAND.logoFallbackPath}
          alt={alt}
          className={imageClassName}
        />
      </picture>
    </div>
  );
}
