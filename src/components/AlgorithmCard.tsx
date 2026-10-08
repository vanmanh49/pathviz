import { memo } from 'react';
import type { AlgorithmInfo } from '../data/algorithms';
import { Facts } from './Panel';

const OPTIMAL = { yes: 'Yes', no: 'No', conditional: 'Depends' };

// Memoised: the card only changes with the algorithm, not with every playback step.
export const AlgorithmCard = memo(function AlgorithmCard({ info }: { info: AlgorithmInfo }) {
  return (
    <section aria-label="Algorithm" className="panel p-3">
      <h2 className="mb-1 text-base font-semibold">{info.name}</h2>
      <p className="mb-3 text-sm text-muted">{info.description}</p>
      <Facts
        items={[
          ['Uses weights', info.weighted ? 'Yes' : 'No'],
          ['Shortest path', OPTIMAL[info.optimal]],
          ['Time', info.time],
          ['Space', info.space],
        ]}
      />
      <p className="mt-3 border-t border-line pt-2 text-sm">
        <span className="text-muted">Shortest path? </span>
        {info.optimalNote}
      </p>
    </section>
  );
});
