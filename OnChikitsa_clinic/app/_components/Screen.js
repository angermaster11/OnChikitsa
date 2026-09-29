'use client';

// App-shell wrapper: a viewport-height flex column. The shell itself never
// scrolls — it's pinned to the dynamic viewport (100dvh) and clips overflow, so
// the single scrolling region is the `.content` child (flex:1; min-height:0;
// overflow-y:auto). TopBar/BottomNav manage their own safe-area insets.
export default function Screen({ children, className = '', ...rest }) {
  return (
    <div
      className={className}
      style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      {...rest}
    >
      {children}
    </div>
  );
}
