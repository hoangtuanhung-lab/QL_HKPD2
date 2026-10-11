import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
export function FormField({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const generatedId = useId();
  const id = input.id ?? generatedId;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
      />
      {error || hint ? (
        <p id={`${id}-help`} role={error ? "alert" : undefined}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
export function DataGrid<T>({
  caption,
  rows,
  rowKey,
  columns,
  emptyMessage = "Chưa có dữ liệu.",
}: {
  caption: string;
  rows: readonly T[];
  rowKey: (row: T) => string;
  columns: readonly {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
  }[];
  emptyMessage?: string;
}) {
  return (
    <div
      className="data-grid"
      role="region"
      aria-label={caption}
      tabIndex={0}
      style={{ overflowX: "auto", maxWidth: "100%" }}
    >
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
/** Native dialog provides focus trapping/Escape. Restore focus to its opener after close. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <button type="button" onClick={onClose} aria-label="Đóng hộp thoại">
        Đóng
      </button>
      {children}
    </dialog>
  );
}
