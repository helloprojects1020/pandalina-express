import placeholderImg from '@/assets/sushi-roll-1.jpg';

/**
 * Handles broken image by replacing src with a fallback.
 * Attach as onError={handleImageError} on <img> elements.
 */
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  if (img.src !== placeholderImg) {
    img.src = placeholderImg;
  }
};

export const FALLBACK_IMAGE = placeholderImg;
