import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '@/api/auth';

export function ResetPasswordView() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Mã khôi phục không hợp lệ.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await resetPassword({ token, new_password: password });
      setSuccess(res.message);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-[#111827] mb-2" style={{ fontWeight: 800, fontSize: '48px' }}>
            LUMINA
          </h1>
          <p className="text-[#4B5563]" style={{ fontSize: '16px' }}>
            Đặt lại mật khẩu mới
          </p>
        </div>

        <div className="border border-[#111827] bg-white p-8">
          <h2 className="text-[#111827] mb-6 text-center" style={{ fontWeight: 800, fontSize: '20px' }}>
            KHÔI PHỤC MẬT KHẨU
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6" style={{ fontSize: '14px' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 mb-6" style={{ fontSize: '14px' }}>
              {success}
              <p className="mt-2 text-xs">Đang chuyển hướng về trang đăng nhập...</p>
            </div>
          )}

          {!success && token && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[#111827] mb-2 block" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.05em' }}>MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>

              <div>
                <label className="text-[#111827] mb-2 block" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.05em' }}>XÁC NHẬN MẬT KHẨU</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Xác nhận mật khẩu mới"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] py-4 text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                style={{ fontWeight: 700, fontSize: '16px' }}
              >
                {loading ? 'ĐANG XỬ LÝ...' : 'CẬP NHẬT MẬT KHẨU'}
              </button>
            </form>
          )}

          {!token && !success && (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#111827] py-4 text-white transition-colors"
              style={{ fontWeight: 700, fontSize: '16px' }}
            >
              QUAY LẠI ĐĂNG NHẬP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
