import * as migration_20260920_195825_baseline from './20260920_195825_baseline';

export const migrations = [
  {
    up: migration_20260920_195825_baseline.up,
    down: migration_20260920_195825_baseline.down,
    name: '20260920_195825_baseline'
  },
];
