import { MockAutomationRepository } from "../../../../../packages/data/mock-automation-repository";
import { MockCommunicationRepository } from "../../../../../packages/data/mock-communication-repository";
import { MockContactRepository } from "../../../../../packages/data/mock-contact-repository";
import { MockCustomerAccountRepository } from "../../../../../packages/data/mock-customer-account-repository";
import { MockInvoiceRepository, MockPaymentRepository, MockTransactionRepository } from "../../../../../packages/data/mock-finance-repositories";
import { MockJobRepository } from "../../../../../packages/data/mock-job-repository";
import { MockLeadRepository } from "../../../../../packages/data/mock-lead-repository";
import { MockPayrollRepository } from "../../../../../packages/data/mock-payroll-repository";
import { MockServiceRepository } from "../../../../../packages/data/mock-service-repository";
import { MockSupportRepository } from "../../../../../packages/data/mock-support-repository";
import { MockWorkforceRepository } from "../../../../../packages/data/mock-workforce-repository";
import { automationFixtures } from "../../../../../packages/test-fixtures/automations";
import { communicationFixtures } from "../../../../../packages/test-fixtures/communications";
import { contactFixtures } from "../../../../../packages/test-fixtures/contacts";
import { customerAccountFixtures } from "../../../../../packages/test-fixtures/customers";
import { invoiceFixtures, paymentFixtures, transactionFixtures } from "../../../../../packages/test-fixtures/finance";
import { jobFixtures } from "../../../../../packages/test-fixtures/jobs";
import { leadFixtures } from "../../../../../packages/test-fixtures/leads";
import { payrollFixtures } from "../../../../../packages/test-fixtures/payroll";
import { serviceFixtures } from "../../../../../packages/test-fixtures/services";
import { supportFixtures } from "../../../../../packages/test-fixtures/support";
import { staffFixtures, teamFixtures } from "../../../../../packages/test-fixtures/workforce";

/** Frontend-only composition root for the Maid Flow rebuild. */
export const maidFlowRepositories = {
  crm: {
    contacts: new MockContactRepository(contactFixtures),
    customers: new MockCustomerAccountRepository(customerAccountFixtures),
    leads: new MockLeadRepository(leadFixtures),
  },
  services: new MockServiceRepository(serviceFixtures),
  workforce: new MockWorkforceRepository([...staffFixtures],[...teamFixtures]),
  schedule: new MockJobRepository(jobFixtures),
  communications: new MockCommunicationRepository(communicationFixtures),
  automations: new MockAutomationRepository(automationFixtures),
  invoices: new MockInvoiceRepository(invoiceFixtures),
  payments: new MockPaymentRepository(paymentFixtures),
  transactions: new MockTransactionRepository(transactionFixtures),
  payroll: new MockPayrollRepository(payrollFixtures),
  support: new MockSupportRepository(supportFixtures),
} as const;
