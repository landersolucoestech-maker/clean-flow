import { MockAutomationRepository } from "../../../../../packages/data/mock-automation-repository";
import { MockCommunicationRepository } from "../../../../../packages/data/mock-communication-repository";
import { MockInvoiceRepository, MockPaymentRepository, MockTransactionRepository } from "../../../../../packages/data/mock-finance-repositories";
import { MockJobRepository } from "../../../../../packages/data/mock-job-repository";
import { automationFixtures } from "../../../../../packages/test-fixtures/automations";
import { communicationFixtures } from "../../../../../packages/test-fixtures/communications";
import { invoiceFixtures, paymentFixtures, transactionFixtures } from "../../../../../packages/test-fixtures/finance";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";

const scheduleRepository = new MockJobRepository(jobFixtures);

/** Frontend-only composition root for the Maid Flow rebuild. */
export const maidFlowRepositories = {
  schedule: scheduleRepository,
  jobs: scheduleRepository,
  communications: new MockCommunicationRepository(communicationFixtures),
  automations: new MockAutomationRepository(automationFixtures),
  invoices: new MockInvoiceRepository(invoiceFixtures),
  payments: new MockPaymentRepository(paymentFixtures),
  transactions: new MockTransactionRepository(transactionFixtures),
} as const;
