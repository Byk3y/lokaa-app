import { SpaceAssetsUtils } from '@/shared/utils/space-assets-utils';

interface SpaceIconProps {
  name: string;
  iconImage?: string | null;
  subdomain?: string;
  /** Rendered width/height in pixels. Defaults to 40. */
  size?: number;
  /** Tailwind rounding class. Defaults to a 10px radius to match the space switcher. */
  rounded?: string;
  className?: string;
}

/**
 * Unified space avatar used everywhere a space is listed (switcher dropdown,
 * settings spaces tab, etc.). Resolves the icon via SpaceAssetsUtils so the same
 * space always renders with the same image / brand color / initials.
 */
export default function SpaceIcon({
  name,
  iconImage,
  subdomain,
  size = 40,
  rounded = 'rounded-[10px]',
  className = '',
}: SpaceIconProps) {
  const assets = SpaceAssetsUtils.resolveSpaceAssets({
    name,
    icon_image: iconImage,
    subdomain,
  });

  const dimensions = { width: size, height: size };

  if (assets.hasIcon && assets.iconUrl) {
    return (
      <img
        src={assets.iconUrl}
        alt={name}
        style={dimensions}
        className={`${rounded} object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        ...dimensions,
        backgroundColor: assets.backgroundColor,
        color: assets.textColor,
      }}
      className={`${rounded} flex items-center justify-center font-bold flex-shrink-0 ${className}`}
    >
      {assets.initials}
    </div>
  );
}
