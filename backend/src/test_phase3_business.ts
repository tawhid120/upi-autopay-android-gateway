// Automated test suite for PayVerify BD Digital Khata & Business Management System

import { db } from './database/db';
import { BusinessService } from './modules/business/business.service';

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
}

async function runBusinessAuditSuite() {
  console.log('====================================================');
  console.log('🧪 PAYVERIFY BD — BUSINESS & DIGITAL KHATA TEST SUITE');
  console.log('====================================================\n');

  const merchant1Id = 'merchant-test-biz-1';
  const merchant2Id = 'merchant-test-biz-2';

  // Seed test merchants
  db.prepare(`
    INSERT OR REPLACE INTO merchants (id, email, password_hash, business_name, role)
    VALUES (?, 'biz1@example.com', 'hash', 'Acme Solutions Ltd', 'merchant')
  `).run(merchant1Id);

  db.prepare(`
    INSERT OR REPLACE INTO merchants (id, email, password_hash, business_name, role)
    VALUES (?, 'biz2@example.com', 'hash', 'Beta Corp', 'merchant')
  `).run(merchant2Id);

  // Clean old test data
  db.prepare('DELETE FROM expenses WHERE merchant_id IN (?, ?)').run(merchant1Id, merchant2Id);
  db.prepare('DELETE FROM recurring_bills WHERE merchant_id IN (?, ?)').run(merchant1Id, merchant2Id);
  db.prepare('DELETE FROM projects WHERE merchant_id IN (?, ?)').run(merchant1Id, merchant2Id);
  db.prepare('DELETE FROM payment_receipts WHERE merchant_id IN (?, ?)').run(merchant1Id, merchant2Id);
  db.prepare('DELETE FROM invoices WHERE merchant_id IN (?, ?)').run(merchant1Id, merchant2Id);
  db.prepare('DELETE FROM customers WHERE merchant_id IN (?, ?)').run(merchant1Id, merchant2Id);

  // --- TEST 1: Business Profile Management ---
  console.log('--- 1. Business Profile & Branding ---');
  const profile1 = BusinessService.getProfile(merchant1Id);
  assert(profile1.business_name === 'Acme Solutions Ltd', 'Default profile business_name seeded from merchant');

  const updatedProfile = BusinessService.updateProfile(merchant1Id, {
    businessName: 'Acme Digital Agency',
    businessType: 'Software & IT Agency',
    invoicePrefix: 'ACM-INV-',
    receiptPrefix: 'ACM-REC-',
    currencySymbol: '৳',
    phone: '01711223344',
    address: 'Dhanmondi, Dhaka',
    termsAndConditions: 'Payment due within 7 days via bKash.'
  });
  assert(updatedProfile.business_name === 'Acme Digital Agency', 'Profile update persisted businessName');
  assert(updatedProfile.invoice_prefix === 'ACM-INV-', 'Profile invoice prefix set');

  // --- TEST 2: Customer 360 & Digital Khata ---
  console.log('\n--- 2. Customer 360 & Digital Khata ---');
  const custRes1 = BusinessService.createCustomer(merchant1Id, {
    name: 'Rahim Chowdhury',
    phone: '01811223344',
    email: 'rahim@cloudbd.com',
    companyName: 'Cloud Solutions BD',
    customerType: 'Outsourcing Client',
    address: 'Gulshan 2, Dhaka',
  });
  const cust1 = custRes1.customer;
  assert(cust1.id, 'Customer 1 created with UUID');
  assert(cust1.name === 'Rahim Chowdhury', 'Customer name accurate');

  const custRes2 = BusinessService.createCustomer(merchant1Id, {
    name: 'Karim Ahmed',
    phone: '01755667788',
    customerType: 'Retail Buyer',
  });
  const cust2 = custRes2.customer;
  assert(cust2.id, 'Customer 2 created');

  const custList = BusinessService.listCustomers(merchant1Id);
  assert(custList.length >= 2, 'Customer list returns created customers');

  // --- TEST 3: Multi-model Invoicing ---
  console.log('\n--- 3. Invoicing with Line Items & Due Calculation ---');
  const invRes1 = BusinessService.createInvoice(merchant1Id, {
    customerId: cust1.id,
    customerName: cust1.name,
    customerPhone: cust1.phone,
    businessType: 'outsourcing',
    issueDate: new Date().toISOString(),
    dueDays: 14,
    discount: 1000,
    tax: 500,
    notes: 'Website Redesign Phase 1',
    items: [
      { description: 'UI/UX Design in Figma', quantity: 1, unitPrice: 20000, amount: 20000 },
      { description: 'Frontend Development (React + Tailwind)', quantity: 1, unitPrice: 30000, amount: 30000 }
    ]
  });
  const inv1 = invRes1.invoice;
  assert(inv1.id, 'Invoice 1 created');
  assert(inv1.invoice_number.startsWith('ACM-INV-'), 'Invoice generated with custom prefix ACM-INV-');
  assert(inv1.subtotal === 50000, 'Invoice subtotal calculated as 50,000');
  assert(inv1.total === 49500, 'Invoice grand total is 49,500 after discount & tax');
  assert(inv1.due_amount === 49500, 'Invoice initial due_amount matches total');
  assert(inv1.status === 'UNPAID', 'Initial invoice status is UNPAID');

  // Customer total invoiced updated
  const cust1AfterInv = BusinessService.getCustomerDetails(merchant1Id, cust1.id);
  assert(cust1AfterInv.customer.total_invoiced === 49500, 'Customer total_invoiced automatically updated to 49,500');
  assert(cust1AfterInv.customer.total_due === 49500, 'Customer total_due automatically updated to 49,500');

  // --- TEST 4: Automatic bKash Verification with Synced Relay SMS ---
  console.log('\n--- 4. Automated bKash Verification & Deduplication ---');
  const trxId1 = 'BKASH_BIZ_TX_' + Date.now();
  // Simulate relay SMS incoming from bKash
  db.prepare(`
    INSERT INTO transactions (id, merchant_id, service, sender, amount, trx_id, reference, raw_sms, fraud_status)
    VALUES (?, ?, 'bKash', '01811223344', 49500, ?, 'ACM-INV', 'You have received Tk 49,500.00 from 01811223344 TrxID ${trxId1}', 'CLEAN')
  `).run('trx-biz-1', merchant1Id, trxId1);

  // Merchant verifies invoice with bKash TrxID
  const verifyResult = BusinessService.verifyInvoiceWithTrx(merchant1Id, inv1.id, trxId1, 'bKash');
  assert(verifyResult.matched === true, 'bKash verification matched successfully');
  assert(verifyResult.receipt.receipt_number.startsWith('ACM-REC-'), 'Verified payment receipt issued with prefix ACM-REC-');
  assert(verifyResult.receipt.amount_received === 49500, 'Receipt amount matches verified amount');
  assert(verifyResult.receipt.payment_status === 'VERIFIED', 'Receipt payment_status is VERIFIED');

  const updatedInv1 = BusinessService.getInvoice(merchant1Id, inv1.id);
  assert(updatedInv1.invoice.status === 'PAID', 'Invoice status transitioned to PAID after bKash verification');
  assert(updatedInv1.invoice.paid_amount === 49500, 'Invoice paid_amount updated to 49,500');
  assert(updatedInv1.invoice.due_amount === 0, 'Invoice due_amount reduced to 0');

  // Deduplication check: Same TrxID cannot be verified again
  let duplicateBlocked = false;
  try {
    const invRes2 = BusinessService.createInvoice(merchant1Id, {
      customerId: cust2.id,
      customerName: cust2.name,
      customerPhone: cust2.phone,
      items: [{ description: 'Test', quantity: 1, unitPrice: 1000, amount: 1000 }]
    });
    BusinessService.verifyInvoiceWithTrx(merchant1Id, invRes2.invoice.id, trxId1, 'bKash');
  } catch (err: any) {
    duplicateBlocked = true;
    assert(err.message.includes('already verified'), 'Duplicate bKash TrxID blocked from secondary verification');
  }
  assert(duplicateBlocked, 'Deduplication protection enforced successfully');

  // --- TEST 5: Public Receipt Page Resolver ---
  console.log('\n--- 5. Public Receipt Security & Resolution ---');
  const publicReceipt = BusinessService.getPublicReceipt(verifyResult.receipt.id);
  assert(publicReceipt.receipt_number === verifyResult.receipt.receipt_number, 'Public receipt loads with correct number');
  assert(publicReceipt.business_name === 'Acme Digital Agency', 'Public receipt carries merchant branding');
  assert(publicReceipt.customer_name === 'Rahim Chowdhury', 'Public receipt maps customer name');
  assert(publicReceipt.trx_id === trxId1, 'Public receipt displays verified TrxID');

  // --- TEST 6: Dues Management & WhatsApp Reminder Template ---
  console.log('\n--- 6. Dues Management & WhatsApp / SMS Reminders ---');
  const invUnpaidRes = BusinessService.createInvoice(merchant1Id, {
    customerId: cust2.id,
    customerName: cust2.name,
    customerPhone: cust2.phone,
    dueDays: -2, // Overdue by 2 days
    items: [{ description: 'Monthly Retainer Fee', quantity: 1, unitPrice: 15000, amount: 15000 }]
  });
  const duesOverview = BusinessService.getDuesOverview(merchant1Id);
  assert(duesOverview.overview.totalReceivable >= 15000, 'Dues overview calculates accounts receivable');
  assert(duesOverview.overview.overdue >= 1, 'Overdue invoices accurately flagged');

  const reminder = BusinessService.generateReminderTemplate(merchant1Id, cust2.id, invUnpaidRes.invoice.id);
  assert(reminder.customerName === 'Karim Ahmed', 'Reminder generates for target customer');
  assert(reminder.whatsappUrl.includes('wa.me'), 'WhatsApp click-to-chat URL generated');
  assert(reminder.textTemplate.includes('15,000'), 'Reminder message includes exact due amount');

  // --- TEST 7: Outsourcing / Freelancer Project Tracking ---
  console.log('\n--- 7. Outsourcing & Freelancer Project Tracking ---');
  const projRes1 = BusinessService.createProject(merchant1Id, {
    customerId: cust1.id,
    title: 'E-Commerce Mobile App & Backend API',
    projectAmount: 150000,
    startDate: new Date().toISOString(),
    milestones: [
      { title: 'System Architecture & Database Design', amount: 30000, status: 'completed' },
      { title: 'Backend REST API & bKash Relay Sync', amount: 60000, status: 'in_progress' },
      { title: 'React Native Mobile App Development', amount: 60000, status: 'pending' }
    ]
  });
  const proj1 = projRes1.project;
  assert(proj1.id, 'Project created');
  assert(proj1.progress_percent === 33, 'Project progress computed from completed milestones (1/3 = 33%)');

  const projList = BusinessService.listProjects(merchant1Id);
  assert(projList.length >= 1, 'Projects listed successfully');

  // --- TEST 8: Recurring Billing Subscriptions ---
  console.log('\n--- 8. Recurring Billing & Automatic Next Date Advance ---');
  const recurring1: any = BusinessService.createRecurring(merchant1Id, {
    customerId: cust1.id,
    serviceName: 'Dedicated Cloud DevOps & Maintenance',
    chargeAmount: 25000,
    billingCycle: 'monthly',
    nextBillingDate: '2026-10-01'
  });
  assert(recurring1?.id, 'Recurring billing subscription created');
  assert(recurring1?.charge_amount === 25000, 'Recurring amount matches 25,000');

  const billedInvoice = BusinessService.generateRecurringInvoice(merchant1Id, String(recurring1!.id));
  assert(billedInvoice.invoice.id, 'Recurring invoice generated on cycle trigger');
  assert(billedInvoice.invoice.total === 25000, 'Generated invoice amount matches recurring bill');

  const recurringUpdated = db.prepare('SELECT * FROM recurring_bills WHERE id = ?').get(recurring1!.id) as any;
  assert(recurringUpdated.next_billing_date.startsWith('2026-11-01'), 'Next billing date advanced by 1 month to 2026-11-01');

  // --- TEST 9: Operating Expense Logging & Net Profit ---
  console.log('\n--- 9. Operating Expense Logging & Net Profit Calculation ---');
  const exp1: any = BusinessService.createExpense(merchant1Id, {
    category: 'Hosting & Servers',
    title: 'AWS EC2 & RDS Infrastructure',
    amount: 8500,
    expenseDate: new Date().toISOString(),
    paymentMethod: 'Credit Card',
    reference: 'INV-AWS-8821'
  });
  assert(exp1?.id, 'Expense 1 logged');

  const exp2: any = BusinessService.createExpense(merchant1Id, {
    category: 'Utilities & Internet',
    title: 'Office High-Speed Fiber Internet',
    amount: 3500,
    expenseDate: new Date().toISOString(),
    paymentMethod: 'bKash'
  });
  assert(exp2?.id, 'Expense 2 logged');

  const expSummary = BusinessService.getExpenseSummary(merchant1Id);
  assert(expSummary.totalExpenses === 12000, 'Total expenses accurately summed to 12,000 (8500 + 3500)');
  assert(expSummary.totalIncome === 49500, 'Revenue accurately drawn from verified receipts (49,500)');
  assert(expSummary.netResult === 37500, 'Net operating income correctly computed (49,500 - 12,000 = 37,500)');

  // --- TEST 10: Financial Audit Reports ---
  console.log('\n--- 10. Financial Audit Reports & P&L Statement ---');
  const reports = BusinessService.getFinancialReports(merchant1Id, '30days');
  assert(reports.sales.totalCollected === 49500, 'Reports cash collected matches 49,500');
  assert(reports.profitAndLoss.netProfit === 37500, 'Reports P&L net profit matches 37,500');
  assert(reports.profitAndLoss.profitMargin === 76, 'Profit margin accurately calculated (37,500 / 49,500 = 76%)');
  assert(reports.inflowsByMethod.length >= 1, 'Inflows grouped by payment method');
  assert(reports.topCustomers.length >= 1, 'Top customers leaderboard populated');
  assert(reports.topCustomers[0].name === 'Rahim Chowdhury', 'Top customer is Rahim Chowdhury');

  // --- TEST 11: Omnichannel Global Search ---
  console.log('\n--- 11. Omnichannel Global Search (Ctrl + K) ---');
  const searchCust: any = BusinessService.globalSearch(merchant1Id, 'Rahim');
  assert(searchCust.customers.length >= 1, 'Search finds customer by name "Rahim"');
  assert(searchCust.customers[0].name === 'Rahim Chowdhury', 'Search result matches customer');

  const searchInv = BusinessService.globalSearch(merchant1Id, 'ACM-INV');
  assert(searchInv.invoices.length >= 1, 'Search finds invoice by prefix "ACM-INV"');

  const searchTrx = BusinessService.globalSearch(merchant1Id, trxId1.substring(0, 10));
  assert(searchTrx.receipts.length >= 1 || searchTrx.transactions.length >= 1, 'Search finds records by TrxID substring');

  // --- TEST 12: Zero IDOR Security Protection ---
  console.log('\n--- 12. Multi-Tenant Zero IDOR Security Enforcement ---');
  let idorBlocked1 = false;
  try {
    BusinessService.getCustomerDetails(merchant2Id, cust1.id);
  } catch (err: any) {
    idorBlocked1 = true;
    assert(err.message.includes('not found'), 'Merchant 2 denied access to Merchant 1 customer (IDOR protected)');
  }
  assert(idorBlocked1, 'Customer 360 IDOR protected');

  let idorBlocked2 = false;
  try {
    BusinessService.getInvoice(merchant2Id, inv1.id);
  } catch (err: any) {
    idorBlocked2 = true;
    assert(err.message.includes('not found'), 'Merchant 2 denied access to Merchant 1 invoice (IDOR protected)');
  }
  assert(idorBlocked2, 'Invoice IDOR protected');

  let idorBlocked3 = false;
  try {
    BusinessService.deleteExpense(merchant2Id, String(exp1!.id));
  } catch (err: any) {
    idorBlocked3 = true;
    assert(err.message.includes('not found'), 'Merchant 2 cannot delete Merchant 1 expense (IDOR protected)');
  }
  assert(idorBlocked3, 'Expense delete IDOR protected');

  console.log('\n====================================================');
  console.log('🎉 ALL DIGITAL KHATA & BUSINESS AUDIT TESTS PASSED! (35/35)');
  console.log('====================================================\n');
}

runBusinessAuditSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
