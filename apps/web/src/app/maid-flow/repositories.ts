import { MockAutomationRepository } from "../../../../../packages/data/mock-automation-repository";
import { MockCommunicationRepository } from "../../../../../packages/data/mock-communication-repository";
import { MockJobRepository } from "../../../../../packages/data/mock-job-repository";
import { automationFixtures } from "../../../../../packages/test-fixtures/automations";
import { communicationFixtures } from "../../../../../packages/test-fixtures/communications";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";

const scheduleRepository = new MockJobRepository(jobFixtures);

/** Frontend-only composition root for the Maid Flow rebuild. */
export const maidFlowRepositories = {
  schedule: scheduleRepository,
  jobs: scheduleRepository,
  communications: new MockCommunicationRepository(communicationFixtures),
  automations: new MockAutomationRepository(automationFixtures),
} as const;
