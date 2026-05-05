import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { login, register, forgotPassword } from '@/api/auth';

type AuthMode = 'login' | 'signup' | 'forgot-password';
type ContactMethod = 'email' | 'phone';

export function AuthView() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot-password') {
        const res = await forgotPassword(email);
        setSuccess(res.message);
        setLoading(false);
        return;
      }

      let res;
      if (mode === 'login') {
        res = await login({
          ...(contactMethod === 'email' ? { email } : { phone }),
          password,
        });
      } else {
        res = await register({
          username,
          ...(contactMethod === 'email' ? { email } : { phone }),
          password,
        });
      }
      setAuth(res.access_token, res.user as any);
      // Navigate based on role
      const role = res.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'staff') navigate('/workspace');
      else navigate('/discovery');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'reader' | 'staff' | 'admin') => {
    setError('');
    setLoading(true);
    try {
      const demoEmails: Record<string, string> = {
        reader: 'reader@lumina.io',
        staff: 'staff@lumina.io',
        admin: 'admin@lumina.io',
      };
      const res = await login({ email: demoEmails[role], password: 'demo123' });
      setAuth(res.access_token, res.user as any);
      if (role === 'admin') navigate('/admin');
      else if (role === 'staff') navigate('/workspace');
      else navigate('/discovery');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Backend đang offline – vui lòng khởi động server backend trước.');
    } finally {
      setLoading(false);
    }
  };

  // Reset contact fields when switching method
  const switchContactMethod = (method: ContactMethod) => {
    setContactMethod(method);
    setEmail('');
    setPhone('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo Header */}
        <div className="text-center mb-12">
          <h1 className="text-[#111827] mb-2" style={{ fontWeight: 800, fontSize: '48px' }}>
            LUMINA
          </h1>
        </div>

        {/* Auth Card */}
        <div className="border border-[#111827] bg-white p-8">
          {/* Toggle Mode */}
          <div className="flex border border-[#E5E7EB] mb-8">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 transition-colors ${mode === 'login' ? 'bg-[#111827] text-white' : 'bg-white text-[#4B5563]'
                }`}
              style={{ fontWeight: 700, fontSize: '14px' }}
            >
              ĐĂNG NHẬP
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 transition-colors ${mode === 'signup' ? 'bg-[#111827] text-white' : 'bg-white text-[#4B5563]'
                }`}
              style={{ fontWeight: 700, fontSize: '14px' }}
            >
              ĐĂNG KÝ
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6" style={{ fontSize: '14px' }}>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 mb-6" style={{ fontSize: '14px' }}>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'forgot-password' && (
              <div className="mb-4">
                <p className="text-[#6B7280] text-sm mb-6">
                  Nhập email của bạn để nhận hướng dẫn khôi phục mật khẩu.
                </p>
                <div>
                  <label className="text-[#111827] mb-2 block" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.05em' }}>EMAIL KHÔI PHỤC</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot-password' && (
              <>
                {mode === 'signup' && (
                  <div>
                    <label className="text-[#111827] mb-2 block" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.05em' }}>HỌ VÀ TÊN</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      placeholder="Nhập họ và tên"
                      required
                    />
                  </div>
                )}

                {/* Contact Method Toggle */}
                <div>
                  <label className="text-[#111827] mb-2 block" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.05em' }}>
                    {mode === 'signup' ? 'ĐĂNG KÝ BẰNG' : 'ĐĂNG NHẬP BẰNG'}
                  </label>
                  <div className="flex border border-[#E5E7EB] mb-3" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => switchContactMethod('email')}
                      className={`flex-1 py-2.5 transition-all duration-200 flex items-center justify-center gap-2 ${contactMethod === 'email'
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                        }`}
                      style={{ fontWeight: 600, fontSize: '13px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => switchContactMethod('phone')}
                      className={`flex-1 py-2.5 transition-all duration-200 flex items-center justify-center gap-2 ${contactMethod === 'phone'
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6]'
                        }`}
                      style={{ fontWeight: 600, fontSize: '13px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                      Số điện thoại
                    </button>
                  </div>

                  {/* Email Input */}
                  {contactMethod === 'email' && (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
                      placeholder="you@example.com"
                      required
                      style={{ borderRadius: '4px' }}
                    />
                  )}

                  {/* Phone Input */}
                  {contactMethod === 'phone' && (
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280] select-none"
                        style={{ fontSize: '14px', fontWeight: 500 }}
                      >
                        +84
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          // Only allow digits
                          const val = e.target.value.replace(/\D/g, '');
                          setPhone(val);
                        }}
                        className="w-full border border-[#E5E7EB] bg-white pl-14 pr-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
                        placeholder="912 345 678"
                        required
                        pattern="[0-9]{9,11}"
                        title="Vui lòng nhập số điện thoại hợp lệ (9-11 số)"
                        style={{ borderRadius: '4px' }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[#111827] mb-2 block" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.05em' }}>MẬT KHẨU</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-4 border border-[#E5E7EB]" />
                  <span className="text-[#4B5563]" style={{ fontSize: '14px', fontWeight: 400, textTransform: 'none' }}>
                    Ghi nhớ đăng nhập
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-[#2563EB] hover:underline"
                  style={{ fontSize: '14px' }}
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] py-4 text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              style={{ fontWeight: 700, fontSize: '16px' }}
            >
              {loading ? 'ĐANG XỬ LÝ...' : mode === 'login' ? 'ĐĂNG NHẬP' : mode === 'signup' ? 'TẠO TÀI KHOẢN' : 'GỬI YÊU CẦU'}
            </button>

            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-[#4B5563] py-2 hover:text-[#111827] transition-colors"
                style={{ fontSize: '14px', fontWeight: 600 }}
              >
                ← Quay lại đăng nhập
              </button>
            )}
          </form>

          <div className="mt-6 border-t border-[#E5E7EB] pt-6">
            <div className="space-y-2">
              <button
                onClick={() => handleDemoLogin('reader')}
                disabled={loading}
                className="w-full border border-[#E5E7EB] bg-white py-2 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                style={{ fontSize: '13px' }}
              >
                Đăng nhập Độc giả
              </button>
              <button
                onClick={() => handleDemoLogin('staff')}
                disabled={loading}
                className="w-full border border-[#E5E7EB] bg-white py-2 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                style={{ fontSize: '13px' }}
              >
                Đăng nhập Nhân viên
              </button>
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="w-full border border-[#E5E7EB] bg-white py-2 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                style={{ fontSize: '13px' }}
              >
                Đăng nhập Quản trị viên
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
