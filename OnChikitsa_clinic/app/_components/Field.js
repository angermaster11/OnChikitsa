'use client';

// Labeled form field. By default wraps children in `.input-wrap` (with optional
// lead/trail adornments); pass `bare` for textareas, chip groups, etc.
export default function Field({
  label, htmlFor, required, optional, hint, error,
  lead, trail, bare = false, children,
}) {
  const msg = error || hint;
  return (
    <div className="field">
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="field-req">*</span> : null}
          {optional ? <span className="field-opt">Optional</span> : null}
        </label>
      ) : null}
      {bare ? children : (
        <div className={`input-wrap ${error ? 'error' : ''}`}>
          {lead ? <span className="lead">{lead}</span> : null}
          {children}
          {trail ? <span className="trail">{trail}</span> : null}
        </div>
      )}
      {msg ? <span className={`field-msg ${error ? 'bad' : 'hint'}`}>{msg}</span> : null}
    </div>
  );
}
