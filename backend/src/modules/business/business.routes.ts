// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Router } from 'express';
import { z } from 'zod';
import { BusinessService } from './business.service';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { standardRateLimiter, publicCheckoutRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

function formatError(err: any): string {
  if (err?.issues && Array.isArray(err.issues)) {
    return err.issues.map((e: any) => `${e.path?.length ? e.path.join('.') + ': ' : ''}${e.message}`).join('; ');
  }
  if (err?.errors && Array.isArray(err.errors)) {
    return err.errors.map((e: any) => `${e.path?.length ? e.path.join('.') + ': ' : ''}${e.message}`).join('; ');
  }
  return err.message || 'Operation failed.';
}

// ==========================================
// PUBLIC RECEIPT RESOLVER
// ==========================================
router.get('/receipts/public/:id', publicCheckoutRateLimiter, (req, res) => {
  try {
    const receiptId = String(req.params.id);
    const receipt = BusinessService.getPublicReceipt(receiptId);
    return res.json({ success: true, data: receipt });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message || 'Receipt not found.' });
  }
});

// ==========================================
// PUBLIC CUSTOMER STATEMENT RESOLVER
// ==========================================
router.get('/customers/public/:id/statement', publicCheckoutRateLimiter, (req, res) => {
  try {
    const customerId = String(req.params.id);
    const statement = BusinessService.getCustomerStatementPublic(customerId);
    return res.json({ success: true, data: statement });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message || 'Customer statement not found.' });
  }
});

// All remaining business routes require authenticated merchant session
router.use(standardRateLimiter);
router.use(requireAuth);

// ==========================================
// 1. BUSINESS PROFILE
// ==========================================
router.get('/profile', (req: AuthenticatedRequest, res) => {
  try {
    const profile = BusinessService.getProfile(req.user!.id);
    return res.json({ success: true, data: profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const profileSchema = z.object({
  businessName: z.string().min(1),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  businessType: z.string().optional(),
  taxVatNumber: z.string().optional(),
  invoicePrefix: z.string().optional(),
  receiptPrefix: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

router.put('/profile', (req: AuthenticatedRequest, res) => {
  try {
    const data = profileSchema.parse(req.body);
    const profile = BusinessService.updateProfile(req.user!.id, data);
    return res.json({ success: true, message: 'Business profile updated successfully.', data: profile });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. CUSTOMER MANAGEMENT (DIGITAL KHATA)
// ==========================================
router.get('/customers', (req: AuthenticatedRequest, res) => {
  try {
    const search = req.query.search as string;
    const type = req.query.type as string;
    const customers = BusinessService.listCustomers(req.user!.id, search, type);
    return res.json({ success: true, count: customers.length, data: customers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(1, 'Customer phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  address: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  customerType: z.string().optional().default('Client'),
  notes: z.string().optional().nullable(),
});

router.post('/customers', (req: AuthenticatedRequest, res) => {
  try {
    const data = customerSchema.parse(req.body);
    const customer = BusinessService.createCustomer(req.user!.id, data as any);
    return res.status(201).json({ success: true, message: 'Customer registered.', data: customer });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.post('/customers/batch-statement', (req: AuthenticatedRequest, res) => {
  try {
    const customerIds = Array.isArray(req.body.customerIds) ? req.body.customerIds : [];
    const statements = BusinessService.getBatchCustomerStatements(req.user!.id, customerIds);
    return res.json({ success: true, count: statements.length, data: statements });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: formatError(err) });
  }
});

router.get('/customers/:id', (req: AuthenticatedRequest, res) => {
  try {
    const details = BusinessService.getCustomerDetails(req.user!.id, String(req.params.id));
    return res.json({ success: true, data: details });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: formatError(err) });
  }
});

router.put('/customers/:id', (req: AuthenticatedRequest, res) => {
  try {
    const data = customerSchema.partial().parse(req.body);
    const updated = BusinessService.updateCustomer(req.user!.id, String(req.params.id), data as any);
    return res.json({ success: true, message: 'Customer updated.', data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.delete('/customers/:id', (req: AuthenticatedRequest, res) => {
  try {
    const result = BusinessService.deleteCustomer(req.user!.id, String(req.params.id));
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. INVOICES
// ==========================================
router.get('/invoices', (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const customerId = req.query.customerId as string;
    const projectId = req.query.projectId as string;
    const invoices = BusinessService.listInvoices(req.user!.id, { status, search, customerId, projectId });
    return res.json({ success: true, count: invoices.length, data: invoices });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0').default(1),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative').default(0),
  amount: z.coerce.number().nonnegative().optional(),
});

const createInvoiceSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')).nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  discount: z.coerce.number().nonnegative().optional().default(0),
  tax: z.coerce.number().nonnegative().optional().default(0),
  dueDays: z.coerce.number().min(0).max(365).optional().default(7),
  dueDate: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  businessType: z.string().optional().default('general'),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  paymentMethod: z.string().optional().default('bKash'),
  clientTelegramUsername: z.string().optional().nullable(),
  clientContact: z.string().optional().nullable(),
  serviceDurationOrType: z.string().optional().nullable(),
  cryptoCurrency: z.string().optional().nullable().default('USDT'),
  cryptoNetwork: z.string().optional().nullable().default('BEP20'),
  receivingWalletAddress: z.string().optional().nullable(),
  txidHash: z.string().optional().nullable(),
  paymentStatus: z.enum(['Draft', 'Pending', 'Paid', 'Under Review']).optional().default('Pending'),
});

router.post('/invoices', (req: AuthenticatedRequest, res) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    if (!data.customerPhone) {
      data.customerPhone = data.clientTelegramUsername || 'N/A';
    }
    const invoice = BusinessService.createInvoice(req.user!.id, data as any);
    return res.status(201).json({ success: true, message: 'Invoice generated.', data: invoice });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.get('/invoices/:id', (req: AuthenticatedRequest, res) => {
  try {
    const invoice = BusinessService.getInvoice(req.user!.id, String(req.params.id));
    return res.json({ success: true, data: invoice });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
});

router.delete('/invoices/:id', (req: AuthenticatedRequest, res) => {
  try {
    const result = BusinessService.deleteInvoice(req.user!.id, String(req.params.id));
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

// Receive manual or offline payment for invoice
const receivePaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  trxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
});

router.post('/invoices/:id/payment', (req: AuthenticatedRequest, res) => {
  try {
    const data = receivePaymentSchema.parse(req.body);
    const receipt = BusinessService.receivePayment(req.user!.id, String(req.params.id), data as any);
    return res.json({ success: true, message: 'Payment recorded and receipt generated.', data: receipt });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

// Automatic verification against synced phone SMS relay
const verifyTrxSchema = z.object({
  trxId: z.string().min(4, 'Transaction ID must be at least 4 characters'),
  service: z.string().default('bKash'),
});

router.post('/invoices/:id/verify-trx', (req: AuthenticatedRequest, res) => {
  try {
    const data = verifyTrxSchema.parse(req.body);
    const result = BusinessService.verifyInvoiceWithTrx(req.user!.id, String(req.params.id), data.trxId, data.service);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

// ==========================================
// 4. PAYMENT RECEIPTS
// ==========================================
router.get('/receipts', (req: AuthenticatedRequest, res) => {
  try {
    const search = req.query.search as string;
    const receipts = BusinessService.listReceipts(req.user!.id, search);
    return res.json({ success: true, count: receipts.length, data: receipts });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/receipts/:id', (req: AuthenticatedRequest, res) => {
  try {
    const receipt = BusinessService.getReceipt(req.user!.id, String(req.params.id));
    return res.json({ success: true, data: receipt });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. PROJECTS & OUTSOURCING
// ==========================================
router.get('/projects', (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string;
    const customerId = req.query.customerId as string;
    const projects = BusinessService.listProjects(req.user!.id, status, customerId);
    return res.json({ success: true, count: projects.length, data: projects });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const projectSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  title: z.string().min(1, 'Project title is required'),
  description: z.string().optional().nullable(),
  serviceCategory: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  expectedEndDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  projectAmount: z.coerce.number().nonnegative().default(0),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  status: z.string().optional().default('active'),
  milestones: z.array(z.any()).optional(),
  notes: z.string().optional().nullable(),
});

router.post('/projects', (req: AuthenticatedRequest, res) => {
  try {
    const data = projectSchema.parse(req.body);
    const project = BusinessService.createProject(req.user!.id, data as any);
    return res.status(201).json({ success: true, message: 'Project initialized.', data: project });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.get('/projects/:id', (req: AuthenticatedRequest, res) => {
  try {
    const details = BusinessService.getProjectDetails(req.user!.id, String(req.params.id));
    return res.json({ success: true, data: details });
  } catch (err: any) {
    return res.status(404).json({ success: false, message: formatError(err) });
  }
});

router.put('/projects/:id', (req: AuthenticatedRequest, res) => {
  try {
    const data = projectSchema.partial().parse(req.body);
    const updated = BusinessService.updateProject(req.user!.id, String(req.params.id), data as any);
    return res.json({ success: true, message: 'Project updated.', data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.delete('/projects/:id', (req: AuthenticatedRequest, res) => {
  try {
    const result = BusinessService.deleteProject(req.user!.id, String(req.params.id));
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

// ==========================================
// 6. RECURRING SUBSCRIPTIONS
// ==========================================
router.get('/recurring', (req: AuthenticatedRequest, res) => {
  try {
    const recurring = BusinessService.listRecurring(req.user!.id);
    return res.json({ success: true, count: recurring.length, data: recurring });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

const recurringSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  chargeAmount: z.coerce.number().positive('Charge amount must be greater than 0'),
  billingCycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  nextBillingDate: z.string().min(1, 'Next billing date is required'),
  autoGenerateInvoice: z.boolean().optional().default(true),
});

router.post('/recurring', (req: AuthenticatedRequest, res) => {
  try {
    const data = recurringSchema.parse(req.body);
    const created = BusinessService.createRecurring(req.user!.id, data as any);
    return res.status(201).json({ success: true, message: 'Recurring billing profile created.', data: created });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.put('/recurring/:id', (req: AuthenticatedRequest, res) => {
  try {
    const data = recurringSchema.partial().extend({ status: z.string().optional() }).parse(req.body);
    const updated = BusinessService.updateRecurring(req.user!.id, String(req.params.id), data as any);
    return res.json({ success: true, message: 'Recurring billing updated.', data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.post('/recurring/:id/generate', (req: AuthenticatedRequest, res) => {
  try {
    const invoice = BusinessService.generateRecurringInvoice(req.user!.id, String(req.params.id));
    return res.json({ success: true, message: 'Invoice generated from recurring subscription.', data: invoice });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.get('/recurring/upcoming', (req: AuthenticatedRequest, res) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 30;
    const upcoming = BusinessService.getUpcomingPayments(req.user!.id, days);
    return res.json({ success: true, count: upcoming.length, data: upcoming });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: formatError(err) });
  }
});

// ==========================================
// 7. DUES MANAGEMENT & REMINDERS
// ==========================================
router.get(['/dues', '/dues/overview'], (req: AuthenticatedRequest, res) => {
  try {
    const dues = BusinessService.getDuesOverview(req.user!.id);
    return res.json({ success: true, data: dues });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: formatError(err) });
  }
});

router.get('/dues/reminder/:customerId', (req: AuthenticatedRequest, res) => {
  try {
    const invoiceId = req.query.invoiceId as string;
    const reminder = BusinessService.generateReminderTemplate(req.user!.id, String(req.params.customerId), invoiceId);
    return res.json({ success: true, data: reminder });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

// ==========================================
// 8. EXPENSES TRACKING
// ==========================================
router.get('/expenses', (req: AuthenticatedRequest, res) => {
  try {
    const category = req.query.category as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const expenses = BusinessService.listExpenses(req.user!.id, category, from, to);
    return res.json({ success: true, count: expenses.length, data: expenses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: formatError(err) });
  }
});

const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  title: z.string().min(1, 'Title is required'),
  amount: z.coerce.number().positive('Expense amount must be greater than 0'),
  expenseDate: z.string().optional().default(() => new Date().toISOString()),
  paymentMethod: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post('/expenses', (req: AuthenticatedRequest, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = BusinessService.createExpense(req.user!.id, data as any);
    return res.status(201).json({ success: true, message: 'Expense recorded.', data: expense });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.delete('/expenses/:id', (req: AuthenticatedRequest, res) => {
  try {
    const result = BusinessService.deleteExpense(req.user!.id, String(req.params.id));
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: formatError(err) });
  }
});

router.get('/expenses/summary', (req: AuthenticatedRequest, res) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const summary = BusinessService.getExpenseSummary(req.user!.id, from, to);
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 9. FINANCIAL REPORTS
// ==========================================
router.get('/reports', (req: AuthenticatedRequest, res) => {
  try {
    const range = (req.query.range as string) || '30days';
    const from = req.query.from as string;
    const to = req.query.to as string;
    const reports = BusinessService.getFinancialReports(req.user!.id, range, from, to);
    return res.json({ success: true, data: reports });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 10. GLOBAL SEARCH & AUDIT LOGS
// ==========================================
router.get('/search', (req: AuthenticatedRequest, res) => {
  try {
    const q = (req.query.q as string) || '';
    const results = BusinessService.globalSearch(req.user!.id, q);
    return res.json({ success: true, data: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/audit-logs', (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const logs = BusinessService.getAuditLogs(req.user!.id, limit);
    return res.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
