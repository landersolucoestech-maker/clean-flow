import { MockJobRepository } from "../../../../../packages/data/mock-job-repository";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";

/**
 * Frontend composition root for the Maid Flow rebuild.
 *
 * Repositories live here so operational projections such as Jobs and Schedule
 * observe the same in-memory state during the frontend-only phase.
 */
export const maidFlowRepositories = {
  jobs: new MockJobRepository(jobFixtures),
} as const;
