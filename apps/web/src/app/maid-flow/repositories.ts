import { MockAutomationRepository } from "../../../../../packages/data/mock-automation-repository";
import { MockCommunicationRepository } from "../../../../../packages/data/mock-communication-repository";
import { MockContactRepository } from "../../../../../packages/data/mock-contact-repository";
import { MockCustomerAccountRepository } from "../../../../../packages/data/mock-customer-account-repository";
import { MockInvoiceRepository, MockPaymentRepository, MockTransactionRepository } from "../../../../../packages/data/mock-finance-repositories";
import { MockJobRepository } from "../../../../../packages/data/mock-job-repository";
import { MockLeadRepository } from "../../../../../packages/data/mock-lead-repository";
import { MockPayrollRepository } from "../../../../../packages/data/mock-payroll-repository";
import { MockSupportRepository } from "../../../../../packages/data/mock-support-repository";
import { automationFixtures } from "../../../../../packages/test-fixtures/automations";
import { communicationFixtures } from "../../../../../packages/test-fixtures/communications";
import { contactFixtures } from "../../../../../packages/test-fixtures/contacts";
import { customerAccountFixtures } from "../../../../../packages/test-fixtures/customers";
import { invoiceFixtures, paymentFixtures, transactionFixtures } from "../../../../../packages/test-fixtures/finance";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";
import { leadFixtures } from "../../../../../packages/test-fixtures/leads";
import { payrollFixtures } from "../../../../../packages/test-fixtures/payroll";
import { supportFixtures } from "../../../../../packages/test-fixtures/support";

/** Frontend-only composition root for the Maid Flow rebuild. */
export const maidFlowRepositories = {
  crm: {
    contacts: new MockContactRepository(contactFixtures),
    customers: new MockCustomerAccountRepository(customerAccountFixtures),
    leads: new MockLeadRepository(leadFixtures),
  },
  schedule: new MockJobRepository(jobFixtures),
  communications: new MockCommunicationRepository(communicationFixtures),
  automations: new MockAutomationRepository(automationFixtures),
  invoices: new MockInvoiceRepository(invoiceFixtures),
  payments: new MockPaymentRepository(paymentFixtures),
  transactions: new MockTransactionRepository(transactionFixtures),
  payroll: new MockPayrollRepository(payrollFixtures),
  support: new MockSupportRepository(supportFixtures),
} as const;
