// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import crypto from 'crypto';
import { db } from '../../database/db';

export interface BusinessProfileData {
  businessName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  businessType?: string;
  taxVatNumber?: string;
  invoicePrefix?: string;
  receiptPrefix?: string;
  currency?: string;
  currencySymbol?: string;
  termsAndConditions?: string;
}

export interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  companyName?: string;
  customerType?: string;
  notes?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CreateInvoiceData {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: InvoiceLineItem[];
  discount?: number;
  tax?: number;
  dueDays?: number;
  dueDate?: string;
  issueDate?: string;
  notes?: string;
  projectId?: string;
  businessType?: string; // 'outsourcing' | 'sales' | 'subscription' | 'service' | 'general'
  paidAmount?: number;
  paymentMethod?: string;
  clientTelegramUsername?: string;
  clientContact?: string;
  serviceDurationOrType?: string;
  cryptoCurrency?: string;
  cryptoNetwork?: string;
  receivingWalletAddress?: string;
  txidHash?: string;
  paymentStatus?: string;
}

export interface ReceivePaymentData {
  amount: number;
  paymentMethod: string;
  trxId?: string;
  notes?: string;
  paymentDate?: string;
}

export interface ProjectData {
  customerId: string;
  title: string;
  description?: string;
  serviceCategory?: string;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  projectAmount: number;
  paidAmount?: number;
  status?: string;
  milestones?: { title: string; amount?: number; status: string; dueDate?: string }[];
  notes?: string;
}

export interface RecurringBillData {
  customerId: string;
  serviceName: string;
  chargeAmount: number;
  billingCycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextBillingDate: string;
  autoGenerateInvoice?: boolean;
}

export interface ExpenseData {
  category: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export class BusinessService {
  // ========================================================
  // 1. BUSINESS PROFILE
  // ========================================================
  static getProfile(merchantId: string) {
    let profile = db.prepare('SELECT * FROM business_profiles WHERE merchant_id = ?').get(merchantId) as any;
    if (!profile) {
      const merchant = db.prepare('SELECT business_name, email, phone FROM merchants WHERE id = ?').get(merchantId) as any;
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO business_profiles (id, merchant_id, business_name, email, phone)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, merchantId, merchant?.business_name || 'My Business', merchant?.email || '', merchant?.phone || '');
      profile = db.prepare('SELECT * FROM business_profiles WHERE id = ?').get(id) as any;
    }
    return profile;
  }

  static updateProfile(merchantId: string, data: BusinessProfileData) {
    this.getProfile(merchantId); // ensure row exists

    db.prepare(`
      UPDATE business_profiles
      SET business_name = COALESCE(?, business_name),
          logo_url = COALESCE(?, logo_url),
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          website = COALESCE(?, website),
          business_type = COALESCE(?, business_type),
          tax_vat_number = COALESCE(?, tax_vat_number),
          invoice_prefix = COALESCE(?, invoice_prefix),
          receipt_prefix = COALESCE(?, receipt_prefix),
          currency = COALESCE(?, currency),
          currency_symbol = COALESCE(?, currency_symbol),
          terms_and_conditions = COALESCE(?, terms_and_conditions),
          updated_at = CURRENT_TIMESTAMP
      WHERE merchant_id = ?
    `).run(
      data.businessName || null,
      data.logoUrl !== undefined ? data.logoUrl : null,
      data.address !== undefined ? data.address : null,
      data.phone !== undefined ? data.phone : null,
      data.email !== undefined ? data.email : null,
      data.website !== undefined ? data.website : null,
      data.businessType || null,
      data.taxVatNumber !== undefined ? data.taxVatNumber : null,
      data.invoicePrefix || null,
      data.receiptPrefix || null,
      data.currency || null,
      data.currencySymbol || null,
      data.termsAndConditions !== undefined ? data.termsAndConditions : null,
      merchantId
    );

    if (data.businessName) {
      db.prepare('UPDATE merchants SET business_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.businessName, merchantId);
    }

    return this.getProfile(merchantId);
  }

  // ========================================================
  // 2. CUSTOMER MANAGEMENT (DIGITAL KHATA)
  // ========================================================
  static listCustomers(merchantId: string, search?: string, customerType?: string) {
    let query = `
      SELECT c.*,
        COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'CANCELLED'), 0) as total_invoiced,
        COALESCE((SELECT SUM(i.paid_amount) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'CANCELLED'), 0) as total_paid,
        COALESCE((SELECT SUM(i.due_amount) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'CANCELLED'), 0) as total_due,
        (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id) as invoice_count,
        (SELECT COUNT(*) FROM payment_receipts r WHERE r.customer_id = c.id) as receipt_count,
        (SELECT COUNT(*) FROM projects p WHERE p.customer_id = c.id AND p.status IN ('Pending', 'In Progress')) as active_projects,
        (SELECT MAX(r.payment_date) FROM payment_receipts r WHERE r.customer_id = c.id) as last_payment_date,
        (SELECT MAX(i.created_at) FROM invoices i WHERE i.customer_id = c.id) as last_invoice_date
      FROM customers c
      WHERE c.merchant_id = ?
    `;
    const params: any[] = [merchantId];

    if (search && search.trim()) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.company_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (customerType && customerType !== 'all') {
      query += ` AND c.customer_type = ?`;
      params.push(customerType);
    }

    query += ` ORDER BY c.created_at DESC`;

    return db.prepare(query).all(...params);
  }

  static createCustomer(merchantId: string, data: CustomerData) {
    const existing = db.prepare('SELECT id FROM customers WHERE merchant_id = ? AND phone = ?').get(merchantId, data.phone.trim()) as any;
    if (existing) {
      throw new Error(`A customer with phone ${data.phone} already exists.`);
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO customers (id, merchant_id, name, phone, email, address, company_name, customer_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merchantId,
      data.name.trim(),
      data.phone.trim(),
      data.email?.trim() || '',
      data.address?.trim() || '',
      data.companyName?.trim() || '',
      data.customerType || 'Client',
      data.notes?.trim() || ''
    );

    this.logAudit(merchantId, 'CUSTOMER_CREATED', { customerId: id, name: data.name, phone: data.phone });
    return this.getCustomerDetails(merchantId, id);
  }

  static getCustomerDetails(merchantId: string, customerId: string) {
    const customer = db.prepare(`
      SELECT c.*,
        COALESCE((SELECT SUM(i.total) FROM invoices i WHERE (i.customer_id = c.id OR (i.customer_phone = c.phone AND i.customer_id IS NULL)) AND i.status != 'CANCELLED'), 0) as total_invoiced,
        COALESCE((SELECT SUM(i.paid_amount) FROM invoices i WHERE (i.customer_id = c.id OR (i.customer_phone = c.phone AND i.customer_id IS NULL)) AND i.status != 'CANCELLED'), 0) as total_paid,
        COALESCE((SELECT SUM(i.due_amount) FROM invoices i WHERE (i.customer_id = c.id OR (i.customer_phone = c.phone AND i.customer_id IS NULL)) AND i.status != 'CANCELLED'), 0) as total_due,
        (SELECT COUNT(*) FROM invoices i WHERE (i.customer_id = c.id OR (i.customer_phone = c.phone AND i.customer_id IS NULL)) AND i.status != 'CANCELLED') as invoice_count,
        (SELECT COUNT(*) FROM payment_receipts r WHERE r.customer_id = c.id) as receipt_count,
        (SELECT MAX(r.payment_date) FROM payment_receipts r WHERE r.customer_id = c.id) as last_payment_date,
        (SELECT MAX(COALESCE(i.issue_date, i.created_at)) FROM invoices i WHERE i.customer_id = c.id OR (i.customer_phone = c.phone AND i.customer_id IS NULL)) as last_invoice_date
      FROM customers c
      WHERE c.id = ? AND c.merchant_id = ?
    `).get(customerId, merchantId) as any;

    if (!customer) throw new Error('Customer not found.');

    const invoices = db.prepare(`
      SELECT id, invoice_number, customer_name, customer_email, customer_phone, total, subtotal, discount, tax, paid_amount, due_amount, status, due_date, issue_date, created_at, business_type, items_json, notes, payment_method
      FROM invoices
      WHERE (customer_id = ? OR (customer_phone = ? AND customer_id IS NULL)) AND merchant_id = ?
      ORDER BY created_at DESC
    `).all(customerId, customer.phone, merchantId) as any[];

    const parsedInvoices = invoices.map(inv => {
      let items: any[] = [];
      try {
        items = typeof inv.items_json === 'string' ? JSON.parse(inv.items_json) : (inv.items_json || []);
      } catch {
        items = [];
      }
      return {
        ...inv,
        items
      };
    });

    const receipts = db.prepare(`
      SELECT r.*, i.invoice_number
      FROM payment_receipts r
      LEFT JOIN invoices i ON r.invoice_id = i.id
      WHERE r.customer_id = ? AND r.merchant_id = ?
      ORDER BY r.payment_date DESC
    `).all(customerId, merchantId) as any[];

    const projects = db.prepare(`
      SELECT * FROM projects
      WHERE customer_id = ? AND merchant_id = ?
      ORDER BY created_at DESC
    `).all(customerId, merchantId) as any[];

    const recurring = db.prepare(`
      SELECT * FROM recurring_bills
      WHERE customer_id = ? AND merchant_id = ?
      ORDER BY created_at DESC
    `).all(customerId, merchantId) as any[];

    const businessProfile = this.getProfile(merchantId);

    // Aggregate all service line items
    const allServices: any[] = [];
    for (const inv of parsedInvoices) {
      if (inv.status === 'CANCELLED') continue;
      const serviceDate = inv.issue_date || inv.created_at;
      if (Array.isArray(inv.items)) {
        for (const it of inv.items) {
          allServices.push({
            date: serviceDate,
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            description: it.description || 'Service',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            amount: Number(it.amount) || ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
            invoiceStatus: inv.status,
            businessType: inv.business_type || 'service',
            notes: inv.notes
          });
        }
      }
    }

    // Sort services by date descending
    allServices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      customer,
      businessProfile,
      invoices: parsedInvoices,
      receipts,
      projects,
      recurring,
      allServices,
      statementSummary: {
        totalInvoiced: customer.total_invoiced || 0,
        totalPaid: customer.total_paid || 0,
        totalDue: customer.total_due || 0,
        invoiceCount: customer.invoice_count || 0,
        receiptCount: customer.receipt_count || 0,
        servicesCount: allServices.length,
        status: (customer.total_due || 0) <= 0 ? 'SETTLED' : 'DUE',
        lastPaymentDate: customer.last_payment_date,
        lastInvoiceDate: customer.last_invoice_date,
      }
    };
  }

  static getBatchCustomerStatements(merchantId: string, customerIds: string[]) {
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return [];
    }
    const results: any[] = [];
    for (const cid of customerIds) {
      try {
        const details = this.getCustomerDetails(merchantId, cid);
        if (details) results.push(details);
      } catch (err) {
        // Skip individual missing customer
      }
    }
    return results;
  }

  static getCustomerStatementPublic(customerId: string) {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
    if (!customer) throw new Error('Customer statement not found.');
    return this.getCustomerDetails(customer.merchant_id, customer.id);
  }

  static updateCustomer(merchantId: string, customerId: string, data: CustomerData) {
    const result = db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          company_name = COALESCE(?, company_name),
          customer_type = COALESCE(?, customer_type),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND merchant_id = ?
    `).run(
      data.name?.trim() || null,
      data.phone?.trim() || null,
      data.email !== undefined ? data.email.trim() : null,
      data.address !== undefined ? data.address.trim() : null,
      data.companyName !== undefined ? data.companyName.trim() : null,
      data.customerType || null,
      data.notes !== undefined ? data.notes.trim() : null,
      customerId,
      merchantId
    );

    if (result.changes === 0) throw new Error('Customer not found.');
    this.logAudit(merchantId, 'CUSTOMER_UPDATED', { customerId, updates: data });
    return this.getCustomerDetails(merchantId, customerId);
  }

  static deleteCustomer(merchantId: string, customerId: string) {
    // Check if customer has paid receipts or active invoices
    const activeInvoices = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE customer_id = ? AND merchant_id = ? AND status != 'CANCELLED'
    `).get(customerId, merchantId) as any;

    if (activeInvoices && activeInvoices.count > 0) {
      throw new Error(`Cannot delete customer with ${activeInvoices.count} associated invoice(s). Archive or cancel invoices first.`);
    }

    const result = db.prepare('DELETE FROM customers WHERE id = ? AND merchant_id = ?').run(customerId, merchantId);
    if (result.changes === 0) throw new Error('Customer not found.');
    this.logAudit(merchantId, 'CUSTOMER_DELETED', { customerId });
    return { success: true, message: 'Customer deleted successfully.' };
  }

  // ========================================================
  // 3. INVOICES SYSTEM & MULTI-TYPE CREATION
  // ========================================================
  static listInvoices(merchantId: string, filters: { status?: string; search?: string; customerId?: string; projectId?: string }) {
    let query = `
      SELECT i.*, c.name as customer_real_name, c.company_name as customer_company, p.title as project_title
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.merchant_id = ?
    `;
    const params: any[] = [merchantId];

    if (filters.status && filters.status !== 'all') {
      query += ` AND i.status = ?`;
      params.push(filters.status);
    }

    if (filters.customerId) {
      query += ` AND i.customer_id = ?`;
      params.push(filters.customerId);
    }

    if (filters.projectId) {
      query += ` AND i.project_id = ?`;
      params.push(filters.projectId);
    }

    if (filters.search && filters.search.trim()) {
      query += ` AND (
        i.invoice_number LIKE ? OR
        i.customer_name LIKE ? OR
        i.customer_phone LIKE ? OR
        i.client_telegram_username LIKE ? OR
        i.client_contact LIKE ? OR
        i.txid_hash LIKE ? OR
        i.receiving_wallet_address LIKE ?
      )`;
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term, term, term, term, term);
    }

    query += ` ORDER BY i.created_at DESC`;

    const invoices = db.prepare(query).all(...params) as any[];
    return invoices.map((inv) => ({
      ...inv,
      items: JSON.parse(inv.items_json || '[]'),
    }));
  }

  static getInvoice(merchantId: string, invoiceId: string) {
    const inv = db.prepare(`
      SELECT i.*, c.name as customer_real_name, c.phone as customer_real_phone, c.email as customer_real_email,
             c.address as customer_real_address, c.company_name as customer_company,
             p.title as project_title,
             bp.business_name, bp.logo_url, bp.address as business_address, bp.phone as business_phone,
             bp.email as business_email, bp.website as business_website, bp.tax_vat_number, bp.currency, bp.currency_symbol
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      LEFT JOIN business_profiles bp ON i.merchant_id = bp.merchant_id
      WHERE (i.id = ? OR i.invoice_number = ?) AND i.merchant_id = ?
    `).get(invoiceId, invoiceId, merchantId) as any;

    if (!inv) throw new Error('Invoice not found.');

    inv.items = JSON.parse(inv.items_json || '[]');

    const receipts = db.prepare(`
      SELECT * FROM payment_receipts WHERE invoice_id = ? AND merchant_id = ? ORDER BY payment_date DESC
    `).all(inv.id, merchantId) as any[];

    return {
      invoice: inv,
      receipts,
    };
  }

  static createInvoice(merchantId: string, data: CreateInvoiceData) {
    const profile = this.getProfile(merchantId);
    const prefix = profile.invoice_prefix || 'INV-';

    // 1. Resolve or Create Customer
    let customerId = data.customerId;
    if (!customerId) {
      let existingCustomer = db.prepare('SELECT id FROM customers WHERE merchant_id = ? AND phone = ?').get(merchantId, data.customerPhone.trim()) as any;
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        customerId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO customers (id, merchant_id, name, phone, email, customer_type)
          VALUES (?, ?, ?, ?, ?, 'Client')
        `).run(customerId, merchantId, data.customerName.trim(), data.customerPhone.trim(), data.customerEmail?.trim() || '');
      }
    }

    // 2. Compute Financials
    const subtotal = data.items.reduce((sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0);
    const discount = Number(data.discount) || 0;
    const tax = Number(data.tax) || 0;
    const total = Math.max(0, subtotal - discount + tax);

    const initialPaid = Number(data.paidAmount) || 0;
    const dueAmount = Math.max(0, total - initialPaid);
    const status = initialPaid >= total && total > 0 ? 'PAID' : (initialPaid > 0 ? 'PARTIAL' : 'UNPAID');

    // 3. Generate Sequence Number
    const countRow = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE merchant_id = ?').get(merchantId) as any;
    const nextSeq = (countRow?.count || 0) + 1;
    const invoiceNumber = `${prefix}${new Date().getFullYear()}-${String(nextSeq).padStart(4, '0')}`;

    const id = crypto.randomUUID();
    const issueDate = data.issueDate ? new Date(data.issueDate).toISOString() : new Date().toISOString();
    const dueDays = data.dueDays || 7;
    const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString();

    const clientTelegram = data.clientTelegramUsername?.trim() || '';
    const clientContact = data.clientContact?.trim() || clientTelegram || '';
    const durationOrType = data.serviceDurationOrType?.trim() || (data.businessType === 'subscription' ? 'Monthly Subscription' : 'One-off Delivery');
    const cryptoCurrency = (data.cryptoCurrency?.trim() || 'USDT').toUpperCase();
    const cryptoNetwork = data.cryptoNetwork?.trim() || 'BEP20';
    const walletAddress = data.receivingWalletAddress?.trim() || '';
    const txidHash = data.txidHash?.trim() || '';
    const paymentStatus = data.paymentStatus || (initialPaid >= total && total > 0 ? 'Paid' : 'Pending');

    const finalStatus = paymentStatus === 'Paid' ? 'PAID' : (paymentStatus === 'Under Review' ? 'UNDER_REVIEW' : (paymentStatus === 'Draft' ? 'DRAFT' : status));

    (db.prepare(`
      INSERT INTO invoices (
        id, merchant_id, customer_id, invoice_number, customer_name, customer_email, customer_phone,
        items_json, subtotal, discount, tax, total, paid_amount, due_amount, notes,
        status, due_date, issue_date, project_id, business_type, payment_method, paid_at,
        client_telegram_username, client_contact, service_duration_or_type,
        crypto_currency, crypto_network, receiving_wallet_address, txid_hash, payment_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `) as any).run(
      id,
      merchantId,
      customerId,
      invoiceNumber,
      data.customerName.trim(),
      data.customerEmail?.trim() || '',
      data.customerPhone.trim(),
      JSON.stringify(data.items),
      subtotal,
      discount,
      tax,
      total,
      initialPaid,
      dueAmount,
      data.notes || '',
      finalStatus,
      dueDate,
      issueDate,
      data.projectId || null,
      data.businessType || 'general',
      data.paymentMethod || 'bKash',
      finalStatus === 'PAID' ? new Date().toISOString() : null,
      clientTelegram,
      clientContact,
      durationOrType,
      cryptoCurrency,
      cryptoNetwork,
      walletAddress,
      txidHash,
      paymentStatus
    );

    // If initial payment was made, generate payment receipt automatically
    if (initialPaid > 0) {
      const receiptId = crypto.randomUUID();
      const receiptPrefix = profile.receipt_prefix || 'RCPT-';
      const receiptNum = `${receiptPrefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      (db.prepare(`
        INSERT INTO payment_receipts (
          id, merchant_id, receipt_number, invoice_id, customer_id,
          amount_received, payment_method, previous_due, paid_amount, remaining_due,
          payment_status, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', 'Initial payment on invoice creation')
      `) as any).run(
        receiptId,
        merchantId,
        receiptNum,
        id,
        customerId,
        initialPaid,
        data.paymentMethod || 'Cash',
        total,
        initialPaid,
        dueAmount
      );
    }

    // If linked to project, update project totals
    if (data.projectId) {
      db.prepare(`
        UPDATE projects
        SET paid_amount = paid_amount + ?,
            due_amount = MAX(0, project_amount - (paid_amount + ?)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND merchant_id = ?
      `).run(initialPaid, initialPaid, data.projectId, merchantId);
    }

    this.logAudit(merchantId, 'INVOICE_CREATED', { invoiceId: id, invoiceNumber, total, customerId });
    return this.getInvoice(merchantId, id);
  }

  static deleteInvoice(merchantId: string, invoiceId: string) {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND merchant_id = ?').get(invoiceId, merchantId) as any;
    if (!invoice) {
      throw new Error('Invoice not found or unauthorized.');
    }

    // If attached to a project, roll back any paid amounts recorded from this invoice
    if (invoice.project_id && invoice.paid_amount > 0) {
      db.prepare(`
        UPDATE projects
        SET paid_amount = MAX(0, paid_amount - ?),
            due_amount = project_amount - MAX(0, paid_amount - ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND merchant_id = ?
      `).run(invoice.paid_amount, invoice.paid_amount, invoice.project_id, merchantId);
    }

    // Delete associated receipts to prevent dangling records
    db.prepare('DELETE FROM payment_receipts WHERE invoice_id = ? AND merchant_id = ?').run(invoiceId, merchantId);

    // Delete the invoice permanently
    db.prepare('DELETE FROM invoices WHERE id = ? AND merchant_id = ?').run(invoiceId, merchantId);

    this.logAudit(merchantId, 'INVOICE_DELETED', {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      total: invoice.total,
      customerName: invoice.customer_name
    });

    return { success: true, message: `Invoice ${invoice.invoice_number} deleted successfully.` };
  }

  // ========================================================
  // 4. RECEIVE PAYMENT & AUTOMATIC BKASH VERIFICATION
  // ========================================================
  static receivePayment(merchantId: string, invoiceId: string, data: ReceivePaymentData) {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND merchant_id = ?').get(invoiceId, merchantId) as any;
    if (!inv) throw new Error('Invoice not found.');

    if (inv.status === 'PAID') throw new Error('Invoice is already fully paid.');
    if (inv.status === 'CANCELLED') throw new Error('Cannot receive payment for a cancelled invoice.');

    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Payment amount must be greater than zero.');

    const previousDue = inv.due_amount !== undefined ? inv.due_amount : inv.total;
    const newPaidAmount = (inv.paid_amount || 0) + amount;
    const newDueAmount = Math.max(0, inv.total - newPaidAmount);
    const newStatus = newDueAmount <= 0 ? 'PAID' : 'PARTIAL';

    const profile = this.getProfile(merchantId);
    const receiptPrefix = profile.receipt_prefix || 'RCPT-';
    const receiptNum = `${receiptPrefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptId = crypto.randomUUID();

    let trxId = data.trxId ? data.trxId.trim().toUpperCase() : null;
    let paymentStatus = 'VERIFIED';

    // bKash / Nagad TrxID deduplication check
    if (trxId) {
      const duplicateReceipt = db.prepare(`
        SELECT id, receipt_number, invoice_id FROM payment_receipts
        WHERE trx_id = ? AND merchant_id = ?
      `).get(trxId, merchantId) as any;

      if (duplicateReceipt) {
        throw new Error(`Duplicate transaction: TrxID ${trxId} was already used on receipt ${duplicateReceipt.receipt_number}.`);
      }

      // Check if transaction exists in phone relay transactions table
      const matchedTrx = db.prepare(`
        SELECT id, trx_id, amount, service, sender, matched_order_id, fraud_status
        FROM transactions
        WHERE trx_id = ? AND merchant_id = ?
      `).get(trxId, merchantId) as any;

      if (matchedTrx) {
        if (matchedTrx.fraud_status === 'DUPLICATE_REUSE') {
          paymentStatus = 'REJECTED';
          throw new Error('Transaction marked as fraudulent or reused.');
        }
      }
    }

    // Update invoice
    db.prepare(`
      UPDATE invoices
      SET paid_amount = ?,
          due_amount = ?,
          status = ?,
          payment_method = ?,
          paid_at = CASE WHEN ? = 'PAID' THEN CURRENT_TIMESTAMP ELSE paid_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND merchant_id = ?
    `).run(newPaidAmount, newDueAmount, newStatus, data.paymentMethod, newStatus, invoiceId, merchantId);

    // Insert Receipt
    db.prepare(`
      INSERT INTO payment_receipts (
        id, merchant_id, receipt_number, invoice_id, customer_id,
        amount_received, payment_method, trx_id, previous_due, paid_amount,
        remaining_due, payment_status, notes, payment_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiptId,
      merchantId,
      receiptNum,
      invoiceId,
      inv.customer_id,
      amount,
      data.paymentMethod,
      trxId,
      previousDue,
      amount,
      newDueAmount,
      paymentStatus,
      data.notes || '',
      data.paymentDate ? new Date(data.paymentDate).toISOString() : new Date().toISOString()
    );

    // If linked to project, update project totals
    if (inv.project_id) {
      db.prepare(`
        UPDATE projects
        SET paid_amount = paid_amount + ?,
            due_amount = MAX(0, project_amount - (paid_amount + ?)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND merchant_id = ?
      `).run(amount, amount, inv.project_id, merchantId);
    }

    this.logAudit(merchantId, 'PAYMENT_RECEIVED', {
      invoiceId,
      receiptId,
      receiptNumber: receiptNum,
      amount,
      paymentMethod: data.paymentMethod,
      trxId,
    });

    return this.getReceipt(merchantId, receiptId);
  }

  // Automatic verification against incoming bKash SMS relay
  static verifyInvoiceWithTrx(merchantId: string, invoiceId: string, trxIdInput: string, service: string = 'bKash') {
    const trxId = trxIdInput.trim().toUpperCase();
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND merchant_id = ?').get(invoiceId, merchantId) as any;
    if (!inv) throw new Error('Invoice not found.');

    if (inv.status === 'PAID') throw new Error('Invoice is already fully paid.');

    // 1. Deduplication check: Check if TrxID already used in payment_receipts
    const duplicate = db.prepare('SELECT id, receipt_number FROM payment_receipts WHERE trx_id = ? AND merchant_id = ?').get(trxId, merchantId) as any;
    if (duplicate) {
      throw new Error(`Transaction ID ${trxId} was already verified and applied to receipt ${duplicate.receipt_number}. Duplicate re-use rejected.`);
    }

    // 2. Lookup in mobile synced transactions
    const incomingTrx = db.prepare(`
      SELECT * FROM transactions WHERE trx_id = ? AND merchant_id = ?
    `).get(trxId, merchantId) as any;

    if (!incomingTrx) {
      // Not yet received from Android app
      return {
        matched: false,
        status: 'PENDING',
        message: `Transaction ${trxId} has not arrived from your Android relay device yet. If you have verified it manually on your phone, you can record it as Manual Confirmation.`,
      };
    }

    // Check amount match
    const previousDue = inv.due_amount !== undefined ? inv.due_amount : inv.total;
    const paymentAmount = incomingTrx.amount;
    const newPaidAmount = (inv.paid_amount || 0) + paymentAmount;
    const newDueAmount = Math.max(0, inv.total - newPaidAmount);
    const newStatus = newDueAmount <= 0 ? 'PAID' : 'PARTIAL';

    const profile = this.getProfile(merchantId);
    const receiptPrefix = profile.receipt_prefix || 'RCPT-';
    const receiptNum = `${receiptPrefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptId = crypto.randomUUID();

    // Mark invoice
    db.prepare(`
      UPDATE invoices
      SET paid_amount = ?,
          due_amount = ?,
          status = ?,
          payment_method = ?,
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND merchant_id = ?
    `).run(newPaidAmount, newDueAmount, newStatus, incomingTrx.service || service, invoiceId, merchantId);

    // Create verified receipt
    db.prepare(`
      INSERT INTO payment_receipts (
        id, merchant_id, receipt_number, invoice_id, customer_id,
        amount_received, payment_method, trx_id, previous_due, paid_amount,
        remaining_due, payment_status, notes, payment_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, CURRENT_TIMESTAMP)
    `).run(
      receiptId,
      merchantId,
      receiptNum,
      invoiceId,
      inv.customer_id,
      paymentAmount,
      incomingTrx.service || service,
      trxId,
      previousDue,
      paymentAmount,
      newDueAmount,
      `Auto-verified via Android bKash Relay. Sender: ${incomingTrx.sender || 'MFS'}`
    );

    // Update transaction record if linked to payment order
    if (inv.paid_order_id) {
      db.prepare('UPDATE transactions SET matched_order_id = ? WHERE id = ?').run(inv.paid_order_id, incomingTrx.id);
    }

    // Update project if linked
    if (inv.project_id) {
      db.prepare(`
        UPDATE projects
        SET paid_amount = paid_amount + ?,
            due_amount = MAX(0, project_amount - (paid_amount + ?)),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND merchant_id = ?
      `).run(paymentAmount, paymentAmount, inv.project_id, merchantId);
    }

    this.logAudit(merchantId, 'TRANSACTION_AUTO_VERIFIED', {
      invoiceId,
      receiptId,
      trxId,
      amount: paymentAmount,
      service: incomingTrx.service,
    });

    return {
      matched: true,
      status: 'VERIFIED',
      receipt: this.getReceipt(merchantId, receiptId),
      message: `Transaction ${trxId} successfully verified! ৳${paymentAmount} credited to invoice ${inv.invoice_number}.`,
    };
  }

  // ========================================================
  // 5. PAYMENT RECEIPTS
  // ========================================================
  static listReceipts(merchantId: string, search?: string) {
    let query = `
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, i.invoice_number, bp.currency_symbol
      FROM payment_receipts r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN invoices i ON r.invoice_id = i.id
      LEFT JOIN business_profiles bp ON r.merchant_id = bp.merchant_id
      WHERE r.merchant_id = ?
    `;
    const params: any[] = [merchantId];

    if (search && search.trim()) {
      query += ` AND (r.receipt_number LIKE ? OR r.trx_id LIKE ? OR c.name LIKE ? OR i.invoice_number LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY r.payment_date DESC`;

    return db.prepare(query).all(...params);
  }

  static getReceipt(merchantId: string, receiptId: string) {
    const receipt = db.prepare(`
      SELECT r.*,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, c.company_name as customer_company,
             i.invoice_number, i.total as invoice_total, i.issue_date as invoice_issue_date, i.items_json,
             bp.business_name, bp.logo_url, bp.address as business_address, bp.phone as business_phone,
             bp.email as business_email, bp.website as business_website, bp.tax_vat_number, bp.currency, bp.currency_symbol
      FROM payment_receipts r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN invoices i ON r.invoice_id = i.id
      LEFT JOIN business_profiles bp ON r.merchant_id = bp.merchant_id
      WHERE (r.id = ? OR r.receipt_number = ?) AND r.merchant_id = ?
    `).get(receiptId, receiptId, merchantId) as any;

    if (!receipt) throw new Error('Receipt not found.');
    if (receipt.items_json) receipt.items = JSON.parse(receipt.items_json);

    return receipt;
  }

  static getPublicReceipt(receiptId: string) {
    const receipt = db.prepare(`
      SELECT r.*,
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, c.company_name as customer_company,
             i.invoice_number, i.total as invoice_total, i.items_json,
             bp.business_name, bp.logo_url, bp.address as business_address, bp.phone as business_phone,
             bp.email as business_email, bp.website as business_website, bp.tax_vat_number, bp.currency, bp.currency_symbol
      FROM payment_receipts r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN invoices i ON r.invoice_id = i.id
      LEFT JOIN business_profiles bp ON r.merchant_id = bp.merchant_id
      WHERE r.id = ? OR r.receipt_number = ?
    `).get(receiptId, receiptId) as any;

    if (!receipt) throw new Error('Receipt not found or invalid link.');
    if (receipt.items_json) receipt.items = JSON.parse(receipt.items_json);

    return receipt;
  }

  // ========================================================
  // 6. OUTSOURCING & FREELANCER WORK (PROJECTS)
  // ========================================================
  static listProjects(merchantId: string, status?: string, customerId?: string) {
    let query = `
      SELECT p.*, c.name as customer_name, c.company_name as customer_company, c.phone as customer_phone,
             (SELECT COUNT(*) FROM invoices i WHERE i.project_id = p.id) as invoice_count
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.merchant_id = ?
    `;
    const params: any[] = [merchantId];

    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (customerId) {
      query += ` AND p.customer_id = ?`;
      params.push(customerId);
    }

    query += ` ORDER BY p.created_at DESC`;

    const projects = db.prepare(query).all(...params) as any[];
    return projects.map((p) => {
      const milestones = JSON.parse(p.milestones_json || '[]');
      const completed = milestones.filter((m: any) => m.status === 'completed').length;
      const progress_percent = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;
      return {
        ...p,
        milestones,
        progress_percent,
      };
    });
  }

  static createProject(merchantId: string, data: ProjectData) {
    const id = crypto.randomUUID();
    const projectAmount = Number(data.projectAmount) || 0;
    const paidAmount = Number(data.paidAmount) || 0;
    const dueAmount = Math.max(0, projectAmount - paidAmount);

    db.prepare(`
      INSERT INTO projects (
        id, merchant_id, customer_id, title, description, service_category,
        start_date, expected_end_date, actual_end_date, project_amount,
        paid_amount, due_amount, status, milestones_json, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merchantId,
      data.customerId,
      data.title.trim(),
      data.description?.trim() || '',
      data.serviceCategory || 'Development',
      data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString(),
      data.expectedEndDate ? new Date(data.expectedEndDate).toISOString() : null,
      data.actualEndDate ? new Date(data.actualEndDate).toISOString() : null,
      projectAmount,
      paidAmount,
      dueAmount,
      data.status || 'In Progress',
      JSON.stringify(data.milestones || []),
      data.notes?.trim() || ''
    );

    this.logAudit(merchantId, 'PROJECT_CREATED', { projectId: id, title: data.title, amount: projectAmount });
    return this.getProjectDetails(merchantId, id);
  }

  static getProjectDetails(merchantId: string, projectId: string) {
    const project = db.prepare(`
      SELECT p.*, c.name as customer_name, c.company_name as customer_company, c.phone as customer_phone, c.email as customer_email
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.id = ? AND p.merchant_id = ?
    `).get(projectId, merchantId) as any;

    if (!project) throw new Error('Project not found.');
    const milestones = JSON.parse(project.milestones_json || '[]');
    const completed = milestones.filter((m: any) => m.status === 'completed').length;
    project.milestones = milestones;
    project.progress_percent = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

    const invoices = db.prepare(`
      SELECT id, invoice_number, total, paid_amount, due_amount, status, due_date, created_at
      FROM invoices
      WHERE project_id = ? AND merchant_id = ?
      ORDER BY created_at DESC
    `).all(projectId, merchantId);

    return {
      project,
      invoices,
    };
  }

  static updateProject(merchantId: string, projectId: string, data: Partial<ProjectData>) {
    const cur = db.prepare('SELECT * FROM projects WHERE id = ? AND merchant_id = ?').get(projectId, merchantId) as any;
    if (!cur) throw new Error('Project not found.');

    const newAmount = data.projectAmount !== undefined ? Number(data.projectAmount) : cur.project_amount;
    const newPaid = data.paidAmount !== undefined ? Number(data.paidAmount) : cur.paid_amount;
    const newDue = Math.max(0, newAmount - newPaid);

    db.prepare(`
      UPDATE projects
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          service_category = COALESCE(?, service_category),
          start_date = COALESCE(?, start_date),
          expected_end_date = COALESCE(?, expected_end_date),
          actual_end_date = COALESCE(?, actual_end_date),
          project_amount = ?,
          paid_amount = ?,
          due_amount = ?,
          status = COALESCE(?, status),
          milestones_json = COALESCE(?, milestones_json),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND merchant_id = ?
    `).run(
      data.title?.trim() || null,
      data.description !== undefined ? data.description.trim() : null,
      data.serviceCategory || null,
      data.startDate ? new Date(data.startDate).toISOString() : null,
      data.expectedEndDate ? new Date(data.expectedEndDate).toISOString() : null,
      data.actualEndDate ? new Date(data.actualEndDate).toISOString() : null,
      newAmount,
      newPaid,
      newDue,
      data.status || null,
      data.milestones ? JSON.stringify(data.milestones) : null,
      data.notes !== undefined ? data.notes.trim() : null,
      projectId,
      merchantId
    );

    this.logAudit(merchantId, 'PROJECT_UPDATED', { projectId, updates: data });
    return this.getProjectDetails(merchantId, projectId);
  }

  static deleteProject(merchantId: string, projectId: string) {
    const result = db.prepare('DELETE FROM projects WHERE id = ? AND merchant_id = ?').run(projectId, merchantId);
    if (result.changes === 0) throw new Error('Project not found.');
    this.logAudit(merchantId, 'PROJECT_DELETED', { projectId });
    return { success: true, message: 'Project deleted successfully.' };
  }

  // ========================================================
  // 7. RECURRING SUBSCRIPTIONS / MONTHLY BILLING
  // ========================================================
  static listRecurring(merchantId: string) {
    const list = db.prepare(`
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, c.company_name as customer_company
      FROM recurring_bills r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.merchant_id = ?
      ORDER BY r.next_billing_date ASC
    `).all(merchantId) as any[];

    return list;
  }

  static createRecurring(merchantId: string, data: RecurringBillData) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO recurring_bills (
        id, merchant_id, customer_id, service_name, charge_amount, billing_cycle,
        next_billing_date, auto_generate_invoice, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      id,
      merchantId,
      data.customerId,
      data.serviceName.trim(),
      Number(data.chargeAmount) || 0,
      data.billingCycle || 'monthly',
      new Date(data.nextBillingDate).toISOString(),
      data.autoGenerateInvoice !== false ? 1 : 0
    );

    this.logAudit(merchantId, 'RECURRING_BILL_CREATED', { recurringId: id, serviceName: data.serviceName });
    return db.prepare('SELECT * FROM recurring_bills WHERE id = ?').get(id);
  }

  static updateRecurring(merchantId: string, id: string, data: Partial<RecurringBillData> & { status?: string }) {
    db.prepare(`
      UPDATE recurring_bills
      SET service_name = COALESCE(?, service_name),
          charge_amount = COALESCE(?, charge_amount),
          billing_cycle = COALESCE(?, billing_cycle),
          next_billing_date = COALESCE(?, next_billing_date),
          auto_generate_invoice = COALESCE(?, auto_generate_invoice),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND merchant_id = ?
    `).run(
      data.serviceName || null,
      data.chargeAmount !== undefined ? Number(data.chargeAmount) : null,
      data.billingCycle || null,
      data.nextBillingDate ? new Date(data.nextBillingDate).toISOString() : null,
      data.autoGenerateInvoice !== undefined ? (data.autoGenerateInvoice ? 1 : 0) : null,
      data.status || null,
      id,
      merchantId
    );

    return db.prepare('SELECT * FROM recurring_bills WHERE id = ?').get(id);
  }

  static generateRecurringInvoice(merchantId: string, recurringId: string) {
    const rec = db.prepare(`
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM recurring_bills r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.id = ? AND r.merchant_id = ?
    `).get(recurringId, merchantId) as any;

    if (!rec) throw new Error('Recurring subscription not found.');

    const created = this.createInvoice(merchantId, {
      customerId: rec.customer_id,
      customerName: rec.customer_name,
      customerPhone: rec.customer_phone,
      customerEmail: rec.customer_email,
      items: [
        {
          description: `${rec.service_name} (${rec.billing_cycle.toUpperCase()} SUBSCRIPTION)`,
          quantity: 1,
          unitPrice: rec.charge_amount,
          amount: rec.charge_amount,
        },
      ],
      dueDays: 7,
      businessType: 'subscription',
      notes: `Recurring ${rec.billing_cycle} service invoice automatically generated.`,
    });

    // Advance next_billing_date
    const nextDate = new Date(rec.next_billing_date);
    if (rec.billing_cycle === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (rec.billing_cycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (rec.billing_cycle === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (rec.billing_cycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

    db.prepare(`
      UPDATE recurring_bills
      SET next_billing_date = ?,
          last_generated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextDate.toISOString(), recurringId);

    return created;
  }

  static getUpcomingPayments(merchantId: string, daysAhead: number = 30) {
    const limitDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
    return db.prepare(`
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, c.company_name as customer_company
      FROM recurring_bills r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.merchant_id = ? AND r.status = 'active' AND r.next_billing_date <= ?
      ORDER BY r.next_billing_date ASC
    `).all(merchantId, limitDate);
  }

  // ========================================================
  // 8. DUE MANAGEMENT & REMINDERS
  // ========================================================
  static getDuesOverview(merchantId: string) {
    const now = new Date().toISOString();
    const endOfWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(due_amount), 0) as total_receivable,
        COALESCE(SUM(CASE WHEN due_date < ? AND status != 'PAID' THEN due_amount ELSE 0 END), 0) as total_overdue,
        COALESCE(SUM(CASE WHEN due_date >= ? AND due_date <= ? AND status != 'PAID' THEN due_amount ELSE 0 END), 0) as due_this_week
      FROM invoices
      WHERE merchant_id = ? AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
    `).get(now, now, endOfWeek, merchantId) as any;

    const customerDues = db.prepare(`
      SELECT c.id as customer_id, c.name as customer_name, c.phone as customer_phone, c.company_name,
             SUM(i.due_amount) as customer_total_due,
             SUM(CASE WHEN i.due_date < ? THEN i.due_amount ELSE 0 END) as customer_overdue,
             MIN(i.due_date) as oldest_due_date,
             COUNT(i.id) as unpaid_invoice_count
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.merchant_id = ? AND i.status IN ('UNPAID', 'PARTIAL', 'OVERDUE') AND i.due_amount > 0
      GROUP BY c.id
      ORDER BY customer_overdue DESC, customer_total_due DESC
    `).all(now, merchantId) as any[];

    return {
      overview: {
        totalReceivable: totals?.total_receivable || 0,
        overdue: totals?.total_overdue || 0,
        dueThisWeek: totals?.due_this_week || 0,
      },
      customerDues,
    };
  }

  static generateReminderTemplate(merchantId: string, customerId: string, invoiceId?: string) {
    const profile = this.getProfile(merchantId);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND merchant_id = ?').get(customerId, merchantId) as any;
    if (!customer) throw new Error('Customer not found.');

    let dueAmount = 0;
    let invoiceInfo = '';

    if (invoiceId) {
      const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND merchant_id = ?').get(invoiceId, merchantId) as any;
      if (inv) {
        dueAmount = inv.due_amount || inv.total;
        invoiceInfo = `Invoice #${inv.invoice_number}`;
      }
    } else {
      const totalDueRow = db.prepare(`
        SELECT SUM(due_amount) as total_due FROM invoices
        WHERE customer_id = ? AND merchant_id = ? AND status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
      `).get(customerId, merchantId) as any;
      dueAmount = totalDueRow?.total_due || 0;
      invoiceInfo = 'Outstanding Account Balance';
    }

    const businessName = profile.business_name || 'Our Company';
    const currency = profile.currency_symbol || '৳';

    const message = `Hello ${customer.name},\n\nThis is a polite reminder from ${businessName} regarding ${invoiceInfo} of ${currency}${dueAmount.toLocaleString()}.\n\nKindly clear the payment at your earliest convenience. You can pay via bKash, Nagad, or Bank Transfer.\n\nThank you for your business!`;

    // WhatsApp Direct Link
    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01')) cleanPhone = '88' + cleanPhone;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    // Mailto Link
    const mailtoUrl = customer.email
      ? `mailto:${customer.email}?subject=${encodeURIComponent(`Payment Reminder: ${invoiceInfo} - ${businessName}`)}&body=${encodeURIComponent(message)}`
      : null;

    return {
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      dueAmount,
      currency,
      invoiceInfo,
      textTemplate: message,
      whatsappUrl,
      mailtoUrl,
    };
  }

  // ========================================================
  // 9. EXPENSES TRACKING
  // ========================================================
  static listExpenses(merchantId: string, category?: string, fromDate?: string, toDate?: string) {
    let query = `SELECT * FROM expenses WHERE merchant_id = ?`;
    const params: any[] = [merchantId];

    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (fromDate) {
      query += ` AND expense_date >= ?`;
      params.push(new Date(fromDate).toISOString());
    }

    if (toDate) {
      query += ` AND expense_date <= ?`;
      params.push(new Date(toDate).toISOString());
    }

    query += ` ORDER BY expense_date DESC`;

    return db.prepare(query).all(...params);
  }

  static createExpense(merchantId: string, data: ExpenseData) {
    const id = crypto.randomUUID();
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('Expense amount must be greater than zero.');

    db.prepare(`
      INSERT INTO expenses (id, merchant_id, category, title, amount, expense_date, payment_method, reference, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      merchantId,
      data.category,
      data.title.trim(),
      amount,
      data.expenseDate ? new Date(data.expenseDate).toISOString() : new Date().toISOString(),
      data.paymentMethod || 'Cash',
      data.reference?.trim() || '',
      data.notes?.trim() || ''
    );

    this.logAudit(merchantId, 'EXPENSE_RECORDED', { expenseId: id, category: data.category, amount });
    return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
  }

  static deleteExpense(merchantId: string, expenseId: string) {
    const result = db.prepare('DELETE FROM expenses WHERE id = ? AND merchant_id = ?').run(expenseId, merchantId);
    if (result.changes === 0) throw new Error('Expense not found.');
    this.logAudit(merchantId, 'EXPENSE_DELETED', { expenseId });
    return { success: true, message: 'Expense deleted successfully.' };
  }

  static getExpenseSummary(merchantId: string, fromDate?: string, toDate?: string) {
    let dateFilter = '';
    const params: any[] = [merchantId];

    if (fromDate && toDate) {
      dateFilter = ` AND expense_date >= ? AND expense_date <= ?`;
      params.push(new Date(fromDate).toISOString(), new Date(toDate).toISOString());
    }

    const totalExpense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE merchant_id = ? ${dateFilter}
    `).get(...params) as any;

    const byCategory = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
      FROM expenses
      WHERE merchant_id = ? ${dateFilter}
      GROUP BY category
      ORDER BY amount DESC
    `).all(...params) as any[];

    // Income for the same period
    let incomeParams: any[] = [merchantId];
    let incomeFilter = '';
    if (fromDate && toDate) {
      incomeFilter = ` AND payment_date >= ? AND payment_date <= ?`;
      incomeParams.push(new Date(fromDate).toISOString(), new Date(toDate).toISOString());
    }

    const totalIncome = db.prepare(`
      SELECT COALESCE(SUM(amount_received), 0) as total FROM payment_receipts WHERE merchant_id = ? AND payment_status = 'VERIFIED' ${incomeFilter}
    `).get(...incomeParams) as any;

    const incomeVal = totalIncome?.total || 0;
    const expenseVal = totalExpense?.total || 0;
    const netResult = incomeVal - expenseVal;

    return {
      totalIncome: incomeVal,
      totalExpenses: expenseVal,
      netResult,
      byCategory,
    };
  }

  // ========================================================
  // 10. FINANCIAL REPORTS & ANALYTICS
  // ========================================================
  static getFinancialReports(merchantId: string, range: string = '30days', customFrom?: string, customTo?: string) {
    const now = new Date();
    let fromDate = new Date();

    if (range === 'today') {
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === '7days') {
      fromDate.setDate(now.getDate() - 7);
    } else if (range === '30days') {
      fromDate.setDate(now.getDate() - 30);
    } else if (range === 'this_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'last_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      now.setDate(0); // last day of prev month
    } else if (range === 'this_year') {
      fromDate = new Date(now.getFullYear(), 0, 1);
    } else if (range === 'custom' && customFrom && customTo) {
      fromDate = new Date(customFrom);
      now.setTime(new Date(customTo).getTime());
    }

    const fromIso = fromDate.toISOString();
    const toIso = now.toISOString();

    // 1. Sales Metrics
    const salesMetrics = db.prepare(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(due_amount), 0) as total_outstanding,
        COALESCE(AVG(total), 0) as average_invoice
      FROM invoices
      WHERE merchant_id = ? AND created_at >= ? AND created_at <= ? AND status != 'CANCELLED'
    `).get(merchantId, fromIso, toIso) as any;

    // 2. Inflows by Payment Method
    const inflowsByMethod = db.prepare(`
      SELECT payment_method, COALESCE(SUM(amount_received), 0) as total, COUNT(*) as count
      FROM payment_receipts
      WHERE merchant_id = ? AND payment_date >= ? AND payment_date <= ? AND payment_status = 'VERIFIED'
      GROUP BY payment_method
      ORDER BY total DESC
    `).all(merchantId, fromIso, toIso) as any[];

    // 3. Top Customers by Revenue
    const topCustomers = db.prepare(`
      SELECT c.id, c.name, c.phone, c.company_name,
             COALESCE(SUM(r.amount_received), 0) as total_paid,
             COUNT(r.id) as payment_count
      FROM customers c
      JOIN payment_receipts r ON c.id = r.customer_id
      WHERE c.merchant_id = ? AND r.payment_date >= ? AND r.payment_date <= ? AND r.payment_status = 'VERIFIED'
      GROUP BY c.id
      ORDER BY total_paid DESC
      LIMIT 5
    `).all(merchantId, fromIso, toIso) as any[];

    // 4. Expense Breakdown
    const expenseMetrics = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      WHERE merchant_id = ? AND expense_date >= ? AND expense_date <= ?
      GROUP BY category
      ORDER BY total DESC
    `).all(merchantId, fromIso, toIso) as any[];

    const totalExpenseVal = expenseMetrics.reduce((sum: number, e: any) => sum + e.total, 0);
    const totalRevenueVal = salesMetrics?.total_collected || 0;
    const netProfit = totalRevenueVal - totalExpenseVal;

    return {
      period: { from: fromIso, to: toIso, range },
      sales: {
        totalSales: salesMetrics?.total_sales || 0,
        totalCollected: totalRevenueVal,
        totalOutstanding: salesMetrics?.total_outstanding || 0,
        totalInvoices: salesMetrics?.total_invoices || 0,
        averageInvoice: Math.round(salesMetrics?.average_invoice || 0),
      },
      profitAndLoss: {
        revenue: totalRevenueVal,
        expenses: totalExpenseVal,
        netProfit,
        profitMargin: totalRevenueVal > 0 ? Math.round((netProfit / totalRevenueVal) * 100) : 0,
      },
      inflowsByMethod,
      topCustomers,
      expenseMetrics,
    };
  }

  // ========================================================
  // 11. GLOBAL SEARCH
  // ========================================================
  static globalSearch(merchantId: string, q: string) {
    const term = q.trim();
    if (!term || term.length < 2) return { customers: [], invoices: [], receipts: [], projects: [], transactions: [] };

    const searchWildcard = `%${term}%`;

    const customers = db.prepare(`
      SELECT id, name, phone, email, company_name, customer_type
      FROM customers
      WHERE merchant_id = ? AND (name LIKE ? OR phone LIKE ? OR company_name LIKE ? OR email LIKE ?)
      LIMIT 6
    `).all(merchantId, searchWildcard, searchWildcard, searchWildcard, searchWildcard);

    const invoices = db.prepare(`
      SELECT id, invoice_number, customer_name, customer_phone, total, status, due_date
      FROM invoices
      WHERE merchant_id = ? AND (invoice_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)
      LIMIT 6
    `).all(merchantId, searchWildcard, searchWildcard, searchWildcard);

    const receipts = db.prepare(`
      SELECT r.id, r.receipt_number, r.amount_received, r.payment_method, r.trx_id, r.payment_date, c.name as customer_name
      FROM payment_receipts r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.merchant_id = ? AND (r.receipt_number LIKE ? OR r.trx_id LIKE ? OR c.name LIKE ?)
      LIMIT 6
    `).all(merchantId, searchWildcard, searchWildcard, searchWildcard);

    const projects = db.prepare(`
      SELECT p.id, p.title, p.project_amount, p.status, c.name as customer_name
      FROM projects p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.merchant_id = ? AND (p.title LIKE ? OR c.name LIKE ?)
      LIMIT 6
    `).all(merchantId, searchWildcard, searchWildcard);

    const transactions = db.prepare(`
      SELECT id, trx_id, service, sender, amount, created_at
      FROM transactions
      WHERE merchant_id = ? AND (trx_id LIKE ? OR sender LIKE ?)
      LIMIT 6
    `).all(merchantId, searchWildcard, searchWildcard);

    return {
      customers,
      invoices,
      receipts,
      projects,
      transactions,
    };
  }

  // ========================================================
  // 12. AUDIT LOGGING HELPER
  // ========================================================
  private static logAudit(merchantId: string, action: string, metadata: any) {
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, merchant_id, action, metadata_json)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), merchantId, action, JSON.stringify(metadata));
    } catch (e) {
      console.error('[AUDIT LOG ERROR]', e);
    }
  }

  static getAuditLogs(merchantId: string, limit: number = 50) {
    return db.prepare(`
      SELECT * FROM audit_logs
      WHERE merchant_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(merchantId, limit);
  }
}
