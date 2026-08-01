import { useId } from 'react';

/**
 * Inline SVG icon — references symbols defined in /public/icons.svg.
 * Usage: <Icon name="search" />
 */
export default function Icon({ name, className = '', size = 20, strokeWidth = 1.6 }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
    >
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}