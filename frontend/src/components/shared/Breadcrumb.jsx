import { ChevronRight, LayoutDashboard } from 'lucide-react';

/**
 * Breadcrumb — renders a trail like: Dashboard > Students
 *
 * Props:
 *   crumbs : { label: string, href?: string }[]
 *            — last item is the active (gold) leaf, rest are links
 */
const Breadcrumb = ({ crumbs = [] }) => {
  if (!crumbs || crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-4">
      {/* Home icon */}
      <LayoutDashboard
        size={13}
        className="text-slate-400 dark:text-slate-500 shrink-0"
        aria-hidden="true"
      />

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                size={12}
                className="text-slate-300 dark:text-slate-600 shrink-0"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span
                className="text-xs font-semibold text-[#D4AF37] truncate max-w-[160px]"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : crumb.href ? (
              <a
                href={crumb.href}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-[#D4AF37] transition-colors truncate max-w-[120px]"
              >
                {crumb.label}
              </a>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
