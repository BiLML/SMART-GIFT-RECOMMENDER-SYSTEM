import { BarChart3, BookOpen, Search, User, Upload, LogOut, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { CartDrawer } from './CartDrawer';

type View = 'discovery' | 'reading' | 'profile' | 'workspace' | 'admin';

export function Navigation() {
  const { role, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);

  const getCurrentView = (): View => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/workspace')) return 'workspace';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/reading') || path.startsWith('/book/')) return 'reading';
    return 'discovery';
  };

  const currentView = getCurrentView();

  const readerNavItems = [
    { id: 'discovery' as View, path: '/discovery', label: 'KHÁM PHÁ', icon: Search },
    { id: 'reading' as View, path: '/reading', label: 'ĐỌC SÁCH', icon: BookOpen },
    { id: 'profile' as View, path: '/profile', label: 'HỒ SƠ', icon: User },
  ];

  const staffNavItems = [
    { id: 'workspace' as View, path: '/workspace', label: 'KHÔNG GIAN NHÂN VIÊN', icon: Upload },
  ];

  const adminNavItems = [
    { id: 'admin' as View, path: '/admin', label: 'BẢNG QUẢN TRỊ', icon: BarChart3 },
  ];

  const navItems =
    role === 'admin' ? adminNavItems : role === 'staff' ? staffNavItems : readerNavItems;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="py-6">
              <button
                onClick={() => navigate('/discovery')}
                className="text-[#111827] tracking-tight"
                style={{ fontWeight: 800, fontSize: '24px' }}
              >
                LUMINA
              </button>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`flex items-center gap-3 border-b-2 px-6 py-6 transition-colors ${isActive
                        ? 'border-[#2563EB] text-[#2563EB]'
                        : 'border-transparent text-[#4B5563] hover:text-[#111827]'
                        }`}
                    >
                      <Icon size={20} />
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cart Button (only for readers) */}
              {role === 'reader' && (
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative ml-2 border border-[#E5E7EB] bg-white p-2.5 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                >
                  <ShoppingCart size={18} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#2563EB] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="ml-4 border border-[#E5E7EB] bg-white px-4 py-2 text-[#4B5563] hover:border-[#111827] hover:text-[#111827] transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>ĐĂNG XUẤT</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
