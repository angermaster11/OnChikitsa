'use client';

// Icon + title + hint + optional CTA. Use on every list that can be empty.
export default function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="empty">
      {icon ? <div className="em-ic">{icon}</div> : null}
      {title ? <h3>{title}</h3> : null}
      {hint ? <p>{hint}</p> : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  );
}
