import { memo, type CSSProperties, type ReactNode } from 'react';
import { Flag, Play } from 'lucide-react';
import { Panel } from './Panel';

interface Role {
  name: string;
  kind?: string;
  state?: string;
  /** Shown through CSS so it stays out of the item's text. */
  label?: string;
  icon?: ReactNode;
}

const ROLES: Role[] = [
  { name: 'Empty', kind: 'empty' },
  { name: 'Wall', kind: 'wall' },
  { name: 'Weight', kind: 'weight', label: '5' },
  { name: 'Start', kind: 'start', icon: <Play strokeWidth={2.5} /> },
  { name: 'End', kind: 'end', icon: <Flag strokeWidth={2.5} /> },
  { name: 'Frontier', state: 'frontier' },
  { name: 'Visited', state: 'visited' },
  { name: 'Current', state: 'current' },
  { name: 'Path', state: 'path' },
];

/** Every colour used on the grid, drawn with the same styles as the cells themselves. */
export const Legend = memo(function Legend() {
  return (
    <Panel label="Legend" title="Legend">
      <ul className="grid grid-cols-3 gap-x-2 gap-y-2 text-xs">
        {ROLES.map(({ name, kind, state, label, icon }) => (
          <li key={name} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="cell swatch"
              data-kind={kind}
              data-state={state}
              data-label={label}
              style={kind === 'weight' ? ({ '--w': 5 } as CSSProperties) : undefined}
            >
              {icon}
            </span>
            {name}
          </li>
        ))}
      </ul>
    </Panel>
  );
});
