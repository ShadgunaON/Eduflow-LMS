// ─────────────────────────────────────────────────────────────────────────────
// EnrollmentCard.tsx
//
// REACT CONCEPT: Reusable Component with Props
// A component is just a function that receives an object (props) and returns JSX.
// By extracting this card into its own file we follow the Single Responsibility
// Principle — the card only knows how to *display* one enrollment, never how
// to manage the list.
// ─────────────────────────────────────────────────────────────────────────────

// REACT CONCEPT: TypeScript Props Interface
// Defining a strict type for props gives us autocomplete, compile-time safety,
// and self-documenting code. The parent must pass exactly these values.
type Status = "Active" | "Completed" | "Pending";

type Props = {
  studentName: string;
  courseName: string;
  enrolledDate: string;
  status: Status;
  onEdit: () => void;    // callback prop — parent decides what "edit" does
  onDelete: () => void;  // callback prop — parent decides what "delete" does
};

// REACT CONCEPT: Status-to-Style Mapping (derived from props, not state)
// Instead of using if/else chains in JSX, we use a plain object as a lookup
// table. This keeps JSX clean and makes adding new statuses trivial.
const STATUS_STYLES: Record<Status, string> = {
  Active:    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30",
  Pending:   "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
  Completed: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
};

const STATUS_DOT: Record<Status, string> = {
  Active:    "bg-green-500 dark:bg-green-400",
  Pending:   "bg-yellow-500 dark:bg-yellow-400",
  Completed: "bg-blue-500 dark:bg-blue-400",
};

// REACT CONCEPT: Named Export Default Function (Component)
export default function EnrollmentCard({
  studentName,
  courseName,
  enrolledDate,
  status,
  onEdit,
  onDelete,
}: Props) {
  // Format date for display — pure JS, not React-specific
  const formattedDate = new Date(enrolledDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    // REACT CONCEPT: className (not class) — JSX uses camelCase attributes
    // because JSX is transpiled to JS and `class` is a reserved keyword.
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-all group">

      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-4">

        {/* Avatar — first letter of student name */}
        <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 dark:text-violet-400 text-lg font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
          {studentName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{studentName}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 truncate">
            📚 {courseName}
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 truncate">
            Enrolled: {formattedDate}
          </p>
        </div>
      </div>

      {/* Right: Status badge + Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-4 sm:mt-0">

        {/* Status Badge — style computed from STATUS_STYLES lookup */}
        <span
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[status]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {status}
        </span>

        {/* REACT CONCEPT: Event Handler Props (onClick)
            We don't call onEdit() here — we pass a reference.
            The parent provided these functions; clicking just invokes them. */}
        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
