import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { AuthView } from '@/components/AuthView';
import { ResetPasswordView } from '@/components/ResetPasswordView';
import { Navigation } from '@/components/Navigation';
import { DiscoveryView } from '@/components/DiscoveryView';
import { ReadingView } from '@/components/ReadingView';
import { BookDetail } from '@/components/BookDetail';
import { ReaderProfile } from '@/components/ReaderProfile';
import { StaffWorkspace } from '@/components/StaffWorkspace';
import { AdminDashboard } from '@/components/AdminDashboard';
import { CheckoutView } from '@/components/CheckoutView';
import { ChatWidget } from '@/components/ChatWidget';

function ProtectedLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[#111827] mb-4" style={{ fontWeight: 800, fontSize: '48px' }}>LUMINA</h1>
          <p className="text-[#4B5563]" style={{ fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Outlet />
      <ChatWidget />
    </div>
  );
}

function RoleGuard({ allowed, children }: { allowed: string[]; children: React.ReactNode }) {
  const { role } = useAuth();
  if (!role || !allowed.includes(role)) return <Navigate to="/discovery" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<AuthView />} />
            <Route path="/reset-password" element={<ResetPasswordView />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/discovery" element={<DiscoveryView />} />
              <Route path="/book/:id" element={<BookDetail />} />
              <Route path="/reading" element={<ReadingView />} />
              <Route path="/profile" element={<ReaderProfile />} />
              <Route path="/checkout" element={<CheckoutView />} />
              <Route
                path="/workspace"
                element={<RoleGuard allowed={['staff', 'admin']}><StaffWorkspace /></RoleGuard>}
              />
              <Route
                path="/admin"
                element={<RoleGuard allowed={['admin']}><AdminDashboard /></RoleGuard>}
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
