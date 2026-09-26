'use client';

// App-shell wrapper: full-height flex column. Sticky TopBar/BottomNav manage
// their own safe-area insets, and the scrolling region is a `.content` child.
export default function Screen({ children, className = '', ...rest }) {
  return (
    <div
      className={className}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
      {...rest}
    >
      {children}
    </div>
  );
}
