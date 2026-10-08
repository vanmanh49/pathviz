import type { AlgorithmInfo } from '../data/algorithms';
import { Panel } from './Panel';

/** `line` is the 1-based line of the current step, or 0 when no step has run. */
export function PseudocodePanel({ info, line }: { info: AlgorithmInfo; line: number }) {
  return (
    <Panel label="Pseudocode" title="Pseudocode">
      <ol className="overflow-x-auto font-mono text-xs leading-5">
        {info.pseudocode.map((text, i) => (
          <li
            key={i}
            aria-current={line === i + 1 ? 'true' : undefined}
            className="code-line flex gap-2 rounded px-1 whitespace-pre"
          >
            <span aria-hidden className="w-4 shrink-0 text-right text-muted select-none">
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
