import { User, Mail, Calendar, Settings, Bell, Lock, Loader2, BookOpen, Activity, TrendingUp, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserStats, type UserStats } from '@/api/books';
import { getMyOrders, type Order, cancelOrder } from '@/api/orders';
import { getMyFavorites } from '@/api/interactions';
import { useNavigate } from 'react-router-dom';
import { updateProfile, changePassword, deleteAccount } from '@/api/auth';

export function ReaderProfile() {
  const { user, logout, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'orders' | 'settings'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const navigate = useNavigate();

  // Profile update state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Password change state
  const [pwForm, setPwForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    try {
      await cancelOrder(orderId);
      // Refresh orders
      const updatedOrders = await getMyOrders();
      setOrders(updatedOrders);
      alert('Đơn hàng đã được hủy thành công.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi hủy đơn hàng');
    }
  };

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    getMyOrders().then(setOrders).catch(() => { });
    getMyFavorites().then(setFavorites).catch(() => { });
  }, []);

  const settingsSections = [
    { icon: Bell, label: 'Thông báo', description: 'Quản lý email và thông báo đẩy' },
    { icon: Lock, label: 'Bảo mật', description: 'Mật khẩu, xác thực 2 lớp' },
    { icon: Settings, label: 'Sở thích đọc', description: 'Cỡ chữ, chủ đề, mức độ hỗ trợ AI' },
  ];

  const topCategories = stats?.reading_preferences || [];
  const maxVal = Math.max(...topCategories.map((c) => c.value), 1);

  const kpis = [
    {
      label: 'Sách đã xem',
      value: loadingStats ? '—' : stats ? String(stats.books_viewed) : '0',
      icon: BookOpen,
    },
    {
      label: 'Tương tác',
      value: loadingStats ? '—' : stats ? String(stats.total_actions) : '0',
      icon: Activity,
    },
    {
      label: 'Thể loại yêu thích',
      value: topCategories[0]?.category || '—',
      icon: TrendingUp,
    },
    {
      label: 'Thành viên từ',
      value: stats?.member_since
        ? new Date(stats.member_since).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })
        : user?.created_at
          ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })
          : '—',
      icon: Calendar,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl p-12">
        {/* Header */}
        <div className="mb-10 border-b border-[#E5E7EB] pb-8">
          <h1 className="text-[#111827] mb-2" style={{ fontWeight: 800, fontSize: '36px' }}>
            Hồ Sơ Bạn Đọc
          </h1>
          <p className="text-[#4B5563]" style={{ fontSize: '16px' }}>
            Hành trình đọc sách và cài đặt tài khoản của bạn
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left: Profile Card + Settings */}
          <div className="col-span-4">
            <div className="border border-[#E5E7EB] bg-white p-8 mb-6">
              <div className="bg-[#2563EB] mb-6 flex items-center justify-center" style={{ width: '100px', height: '100px' }}>
                <User size={44} className="text-white" />
              </div>
              <h2 className="text-[#111827] mb-1" style={{ fontWeight: 800, fontSize: '22px' }}>{user?.username || 'Bạn đọc'}</h2>
              <span className="inline-block border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 mb-4 capitalize" style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280' }}>
                {user?.role === 'reader' ? 'Người đọc' : user?.role === 'staff' ? 'Nhân viên' : 'Quản trị viên'}
              </span>
              <div className="space-y-3 mb-6">
                {user?.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={15} className="text-[#9CA3AF]" />
                    <span className="text-[#374151]" style={{ fontSize: '14px' }}>{user.email}</span>
                  </div>
                )}
                {user?.phone && (
                  <div className="flex items-center gap-3">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9CA3AF]">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2v3a2 2 0 0 1 1.51 1.93 11.86 11.86 0 0 0 1.55 4.42 2 2 0 0 1-.45 2.11L4.67 15.5a16 16 0 0 0 6 6l2.03-2.03a2 2 0 0 1 2.11-.45 11.86 11.86 0 0 0 4.42 1.55 2 2 0 0 1 1.93 1.51z" />
                    </svg>
                    <span className="text-[#374151]" style={{ fontSize: '14px' }}>+84 {user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar size={15} className="text-[#9CA3AF]" />
                  <span className="text-[#374151]" style={{ fontSize: '14px' }}>Tham gia {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : 'Gần đây'}</span>
                </div>
              </div>
              <button onClick={() => setActiveTab('settings')} className="w-full border border-[#111827] bg-white py-3 text-[#111827] hover:bg-[#111827] hover:text-white transition-colors" style={{ fontWeight: 700, fontSize: '13px' }}>
                CÀI ĐẶT TÀI KHOẢN
              </button>
            </div>

            <div className="border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                <h3 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '14px' }}>SETTINGS</h3>
              </div>
              <div>
                {settingsSections.map((section, idx) => {
                  const Icon = section.icon;
                  return (
                    <button key={idx} onClick={() => setActiveTab('settings')} className={`w-full flex items-start gap-4 p-5 text-left hover:bg-[#F9FAFB] transition-colors ${idx < settingsSections.length - 1 ? 'border-b border-[#E5E7EB]' : ''}`}>
                      <div className="bg-[#F9FAFB] p-2.5 border border-[#E5E7EB]"><Icon size={18} className="text-[#4B5563]" /></div>
                      <div>
                        <h4 className="text-[#111827] mb-0.5" style={{ fontWeight: 700, fontSize: '13px' }}>{section.label}</h4>
                        <p className="text-[#6B7280]" style={{ fontSize: '12px' }}>{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Content Area */}
          <div className="col-span-8">
            <div className="flex border-b border-[#E5E7EB] mb-8">
              {['overview', 'favorites', 'orders', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
                >
                  {tab === 'overview' ? 'Tổng quan' : tab === 'favorites' ? 'Yêu thích' : tab === 'orders' ? 'Đơn hàng' : 'Cài đặt'}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                      <div key={kpi.label} className="border border-[#E5E7EB] bg-white p-6 flex items-start gap-4">
                        <div className="bg-[#EFF6FF] p-3"><Icon size={22} className="text-[#2563EB]" /></div>
                        <div>
                          {loadingStats && kpi.label !== 'Thành viên từ' ? <Loader2 size={20} className="animate-spin text-[#2563EB] mb-1" /> : <p className="text-[#111827] mb-1" style={{ fontWeight: 800, fontSize: '32px', lineHeight: '1' }}>{kpi.value}</p>}
                          <p className="text-[#6B7280]" style={{ fontSize: '13px' }}>{kpi.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center justify-between">
                    <h3 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '14px' }}>SỞ THÍCH ĐỌC PHÂN TÍCH BỞI AI</h3>
                    {loadingStats && <Loader2 size={16} className="animate-spin text-[#2563EB]" />}
                  </div>
                  <div className="p-8">
                    {!loadingStats && topCategories.length === 0 ? (
                      <div className="text-center py-8"><p className="text-[#9CA3AF]" style={{ fontSize: '14px' }}>Chưa có lịch sử đọc sách — hãy khám phá một vài quyển nhé!</p></div>
                    ) : (
                      <div className="space-y-5">
                        {topCategories.map((pref, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[#111827]" style={{ fontSize: '14px', fontWeight: 600 }}>{pref.category}</span>
                              <span className="text-[#2563EB]" style={{ fontSize: '13px', fontWeight: 700 }}>{pref.value}%</span>
                            </div>
                            <div className="bg-[#E5E7EB] h-2 overflow-hidden">
                              <div className="bg-[#2563EB] h-full transition-all duration-700" style={{ width: `${(pref.value / maxVal) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'favorites' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-bold text-[#111827] mb-6">Sách yêu thích ({favorites.length})</h3>
                {favorites.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#E5E7EB]">
                    <p className="text-[#6B7280] mb-2">Chưa có sách yêu thích nào</p>
                    <button onClick={() => navigate('/discovery')} className="text-[#2563EB] font-bold text-sm hover:underline">Khám phá sách →</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    {favorites.map((book: any) => (
                      <div key={book.id} className="border border-[#E5E7EB] bg-white hover:border-[#2563EB] transition-colors group relative">
                        <button onClick={async (e) => { e.stopPropagation(); const { toggleFavorite } = await import('@/api/interactions'); await toggleFavorite(book.id); setFavorites(prev => prev.filter((f: any) => f.id !== book.id)); }} className="absolute top-2 right-2 z-10 bg-white/90 border border-[#E5E7EB] text-[#6B7280] hover:text-red-500 p-1.5 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                        <div className="cursor-pointer" onClick={() => navigate(`/book/${book.id}`)}>
                          <div className="aspect-[3/4] bg-[#F9FAFB] overflow-hidden">
                            <img src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop'} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-[#111827] text-sm line-clamp-2 mb-1">{book.title}</h4>
                            <p className="text-[#6B7280] text-xs mb-2">{book.author === 'Unknown' ? 'Tác giả ẩn danh' : book.author}</p>
                            {book.price > 0 && <p className="text-[#2563EB] font-bold text-sm">{book.price.toLocaleString('vi-VN')}đ</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-bold mb-6 text-[#111827]">Lịch sử đơn hàng</h3>
                {orders.length === 0 ? (
                  <p className="text-[#6B7280]">Bạn chưa có đơn hàng nào.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {orders.map(order => (
                      <div key={order.id} className="border border-[#E5E7EB] p-6 bg-white">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                          <div><h4 className="font-bold text-[#111827]">Đơn hàng #{order.id}</h4><p className="text-sm text-[#6B7280]">{new Date(order.created_at).toLocaleString('vi-VN')}</p></div>
                          <div className="text-right">
                            <p className="font-bold text-[#2563EB] text-lg">{order.total_amount.toLocaleString('vi-VN')}₫</p>
                            <div className="flex flex-col items-end gap-2 mt-1">
                              <span className={`inline-block px-2 py-1 border text-xs font-bold ${
                                order.status === 'Cancelled' 
                                  ? 'bg-red-50 border-red-200 text-red-600' 
                                  : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563]'
                              }`}>
                                {order.status === 'Pending' ? 'Đang chờ' : order.status === 'Paid' ? 'Đã thanh toán' : order.status === 'Shipped' ? 'Đang giao' : order.status === 'Cancelled' ? 'Đã hủy' : order.status}
                              </span>
                              {(order.status === 'Pending' || order.status === 'Paid') && (
                                <button 
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="text-red-600 hover:text-red-700 text-xs font-bold underline transition-colors"
                                >
                                  Hủy đơn
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm"><span className="text-[#111827]">{item.book_title} (x{item.quantity})</span><span className="text-[#4B5563]">{item.price?.toLocaleString('vi-VN')}₫</span></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4"><h3 className="font-extrabold text-[14px] text-[#111827]">CẬP NHẬT HỒ SƠ</h3></div>
                  <div className="p-6">
                    {profileMsg.text && <div className={`mb-6 p-4 text-sm font-bold ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{profileMsg.text}</div>}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div><label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Tên người dùng</label><input value={profileForm.username} onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} className="w-full border border-[#E5E7EB] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#111827]" /></div>
                      <div><label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Email</label><input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full border border-[#E5E7EB] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#111827]" /></div>
                      <div className="col-span-2"><label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Số điện thoại</label><input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full border border-[#E5E7EB] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#111827]" placeholder="84..." /></div>
                    </div>
                    <button onClick={async () => { setProfileLoading(true); setProfileMsg({ type: '', text: '' }); try { const res = await updateProfile(profileForm); setProfileMsg({ type: 'success', text: res.message }); refreshUser(); } catch (err: any) { setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Lỗi cập nhật hồ sơ' }); } finally { setProfileLoading(false); } }} disabled={profileLoading} className="bg-[#111827] text-white px-6 py-2.5 font-bold text-[13px] hover:bg-black transition-colors disabled:opacity-50">{profileLoading ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}</button>
                  </div>
                </div>

                <div className="border border-[#E5E7EB] bg-white">
                  <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4"><h3 className="font-extrabold text-[14px] text-[#111827]">ĐỔI MẬT KHẨU</h3></div>
                  <div className="p-6">
                    {pwMsg.text && <div className={`mb-6 p-4 text-sm font-bold ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{pwMsg.text}</div>}
                    <div className="space-y-4 mb-6 max-w-md">
                      <div><label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Mật khẩu cũ</label><input type="password" value={pwForm.oldPassword} onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })} className="w-full border border-[#E5E7EB] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#111827]" /></div>
                      <div><label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Mật khẩu mới</label><input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full border border-[#E5E7EB] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#111827]" /></div>
                      <div><label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Xác nhận mật khẩu mới</label><input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="w-full border border-[#E5E7EB] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#111827]" /></div>
                    </div>
                    <button onClick={async () => { if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' }); return; } setPwLoading(true); setPwMsg({ type: '', text: '' }); try { const res = await changePassword({ old_password: pwForm.oldPassword, new_password: pwForm.newPassword }); setPwMsg({ type: 'success', text: res.message }); setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); } catch (err: any) { setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Lỗi đổi mật khẩu' }); } finally { setPwLoading(false); } }} disabled={pwLoading} className="bg-[#111827] text-white px-6 py-2.5 font-bold text-[13px] hover:bg-black transition-colors disabled:opacity-50">{pwLoading ? 'ĐANG XỬ LÝ...' : 'ĐỔI MẬT KHẨU'}</button>
                  </div>
                </div>

                <div className="border border-red-200 bg-red-50/30">
                  <div className="border-b border-red-200 bg-red-50 px-6 py-4"><h3 className="font-extrabold text-[14px] text-red-700 uppercase">XÓA TÀI KHOẢN</h3></div>
                  <div className="p-6">
                    <p className="text-sm text-red-600 mb-4 font-medium">Khi xóa tài khoản, mọi dữ liệu về lịch sử mua hàng, yêu thích và phân tích AI của bạn sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</p>
                    <div className="mb-4">
                      <label className="text-[11px] font-bold text-red-700 uppercase tracking-wider block mb-1.5">Nhập "DELETE" để xác nhận xóa</label>
                      <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="w-full max-w-xs border border-red-200 px-4 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-red-500 bg-white" />
                    </div>
                    <button onClick={async () => { if (deleteConfirm !== 'DELETE') return; if (!confirm('Bạn có chắc chắn muốn xóa tài khoản?')) return; setDeleteLoading(true); try { await deleteAccount(); alert('Tài khoản đã được xóa. Tạm biệt!'); logout(); navigate('/'); } catch (err: any) { alert(err.response?.data?.detail || 'Lỗi khi xóa tài khoản'); } finally { setDeleteLoading(false); } }} disabled={deleteConfirm !== 'DELETE' || deleteLoading} className="bg-red-600 text-white px-6 py-2.5 font-bold text-[13px] hover:bg-red-700 transition-colors disabled:opacity-50">{deleteLoading ? 'ĐANG XÓA...' : 'XÓA TÀI KHOẢN VĨNH VIỄN'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
