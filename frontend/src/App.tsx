import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { HostedCheckoutPage } from './pages/HostedCheckoutPage';
import { DocsPage } from './pages/DocsPage';
import { PublicPaymentLinkPage } from './pages/PublicPaymentLinkPage';
import { PublicInvoicePage } from './pages/PublicInvoicePage';
import { PublicReceiptPage } from './pages/PublicReceiptPage';
import { PublicCustomerStatementPage } from './pages/PublicCustomerStatementPage';
import { SonyXM6Page } from './pages/SonyXM6Page';
import { AuditHistoryPage } from './pages/AuditHistoryPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/history" element={<AuditHistoryPage />} />
          <Route path="/audit" element={<AuditHistoryPage />} />
          <Route path="/sony-xm6" element={<SonyXM6Page />} />
          <Route path="/xm6" element={<SonyXM6Page />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/register" element={<AuthPage initialMode="register" />} />
          <Route path="/dashboard" element={<MerchantDashboard />} />
          <Route path="/admin" element={<SuperAdminPage />} />
          <Route path="/pay/:orderId" element={<HostedCheckoutPage />} />
          <Route path="/link/:code" element={<PublicPaymentLinkPage />} />
          <Route path="/invoice/:id" element={<PublicInvoicePage />} />
          <Route path="/receipt/:id" element={<PublicReceiptPage />} />
          <Route path="/customer-statement/:id" element={<PublicCustomerStatementPage />} />
          <Route path="/statement/:id" element={<PublicCustomerStatementPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
