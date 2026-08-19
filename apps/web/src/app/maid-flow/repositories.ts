import { MockCommunicationRepository } from "../../../../../packages/data/mock-communication-repository";
import { MockJobRepository } from "../../../../../packages/data/mock-job-repository";
import { communicationFixtures } from "../../../../../packages/test-fixtures/communications";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";

/** Frontend-only composition root for the Maid Flow rebuild. */
export const maidFlowRepositories = {
  schedule: new MockJobRepository(jobFixtures),
  communications: new MockCommunicationRepository(communicationFixtures),
} as const;
