import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** A titled card in the sidebar. `label` names the region for assistive technology. */
export function Panel({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      aria-label={label}
      className="panel p-3"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </motion.section>
  );
}

/** A compact list of label and value pairs. */
export function Facts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
