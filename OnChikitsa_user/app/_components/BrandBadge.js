'use client';

// Brand mark: the real OnChikitsa logo held in a white rounded badge so it reads
// cleanly on any background. size: 'sm' | 'md' | 'lg'.
export default function BrandBadge({ size = 'md', className = '' }) {
  return (
    <span className={`brand-badge ${size} ${className}`} role="img" aria-label="OnChikitsa logo">
      <img src="/brand/logo.png" alt="" />
    </span>
  );
}
