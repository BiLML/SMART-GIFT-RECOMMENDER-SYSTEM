import { 
  Users, BookOpen, Activity, CheckCircle, AlertCircle, Clock, Loader2, RefreshCw, 
  DollarSign, Package, Database, Shield, FileText, Brain, Download, Settings, BarChart2 
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { getAdminStats, type AdminStats, getInventoryStats, type InventoryStats } from '@/api/books';
import { getUsers, updateUserRole, type User, getAIConfig, updateAIConfig, getAIPerformance, retrainAIModel, type AIConfig, type AIPerformance, getRevenueStats, type RevenueStats, createBackup, getBackups, type BackupRecord } from '@/api/admin';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'ai' | 'revenue' | 'inventory' | 'system'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Advanced Stats State
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // AI State
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiPerf, setAiPerf] = useState<AIPerformance | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [alpha, setAlpha] = useState(0.5);
  const [topN, setTopN] = useState(10);
  const [savingAi, setSavingAi] = useState(false);
  const [retraining, setRetraining] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getAdminStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch {
      // Backend not connected â€” show zeros
      setStats({
        active_users: 0,
        total_books: 0,
        total_actions: 0,
        system_health: 'â€”',
        monthly_stats: [],
        recent_logs: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchAiData = useCallback(async () => {
    setLoadingAi(true);
    try {
      const [config, perf] = await Promise.all([getAIConfig(), getAIPerformance()]);
      setAiConfig(config);
      setAiPerf(perf);
      setAlpha(config.alpha);
      setTopN(config.top_n);
    } catch {
      // Ignore
    } finally {
      setLoadingAi(false);
    }
  }, []);

  const fetchRevenue = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await getRevenueStats();
      setRevenueStats(data);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await getInventoryStats();
      setInvStats(data);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchBackups = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await getBackups();
      setBackups(data);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { 
    if (activeTab === 'dashboard') fetchStats(); 
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'ai') fetchAiData();
    else if (activeTab === 'revenue') fetchRevenue();
    else if (activeTab === 'inventory') fetchInventory();
    else if (activeTab === 'system') fetchBackups();
  }, [activeTab, fetchStats, fetchUsers, fetchAiData, fetchRevenue, fetchInventory, fetchBackups]);

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      await updateUserRole(userId, role);
      fetchUsers();
    } catch {
      alert('Lỗi khi cập nhật vai trò');
    }
  };

  const handleSaveAiConfig = async () => {
    setSavingAi(true);
    try {
      const updated = await updateAIConfig(alpha, topN);
      setAiConfig(updated);
      alert('Cấu hình AI đã được lưu!');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Lỗi lưu cấu hình');
    } finally {
      setSavingAi(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const res = await retrainAIModel();
      alert(res.message);
      fetchAiData();
    } catch (err: any) {
      alert('Lỗi huấn luyện lại mô hình');
    } finally {
      setRetraining(false);
    }
  };

  const exportAiReport = () => {
    if (!aiPerf) return;
    const reportData = {
      config: aiConfig,
      performance: aiPerf.current_metrics,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai_report_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  const widgets = [
    {
      label: 'Người dùng hoạt động',
      value: stats ? stats.active_users.toLocaleString() : 'â€”',
      icon: Users,
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      label: 'Tổng số sách',
      value: stats ? stats.total_books.toLocaleString() : 'â€”',
      icon: BookOpen,
      color: '#059669',
      bg: '#ECFDF5',
    },
    {
      label: 'Tổng tương tác',
      value: stats ? stats.total_actions.toLocaleString() : 'â€”',
      icon: Activity,
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
    {
      label: 'Trạng thái hệ thống',
      value: stats?.system_health || 'â€”',
      icon: CheckCircle,
      color: '#D97706',
      bg: '#FFFBEB',
    },
  ];

  const maxActions = Math.max(...(stats?.monthly_stats.map((d) => d.actions) || [1]), 1);
  const maxUsers = Math.max(...(stats?.monthly_stats.map((d) => d.users) || [1]), 1);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl p-12">
        {/* Header */}
        <div className="mb-10 border-b border-[#E5E7EB] pb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[#111827] mb-2" style={{ fontWeight: 800, fontSize: '36px' }}>
              Bảng Điều Khiển Quản Trị
            </h1>
            <p className="text-[#4B5563]" style={{ fontSize: '15px' }}>
              Phân tích hệ thống trực tiếp từ cơ sở dữ liệu
              {lastUpdated && (
                <span className="ml-2 text-[#9CA3AF]" style={{ fontSize: '13px' }}>
                  · cập nhật lúc {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            id="refresh-stats-btn"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-2 border border-[#E5E7EB] bg-white px-4 py-2.5 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
            style={{ fontSize: '13px', fontWeight: 600 }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E5E7EB] mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            Tổng Quan Hệ Thống
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'users' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            Quản Lý Người Dùng
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ai' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            <Brain size={18} />
            Quản lý AI
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'revenue' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            <DollarSign size={18} />
            Doanh thu
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            <Package size={18} />
            Kho hàng
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'system' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            <Database size={18} />
            Hệ thống
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={36} className="animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <>
            {/* KPI Widgets */}
            <div className="grid grid-cols-4 gap-4 mb-10">
              {widgets.map((w) => {
                const Icon = w.icon;
                return (
                  <div key={w.label} className="border border-[#E5E7EB] bg-white p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3" style={{ backgroundColor: w.bg }}>
                        <Icon size={22} style={{ color: w.color }} />
                      </div>
                    </div>
                    <p className="text-[#111827] mb-1" style={{ fontWeight: 800, fontSize: '32px', lineHeight: '1' }}>
                      {w.value}
                    </p>
                    <p className="text-[#6B7280]" style={{ fontSize: '13px' }}>
                      {w.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* User Growth Chart */}
              <div className="border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                  <h2 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '15px' }}>
                    NGƯỜI DÙNG ĐĂNG KÝ HÀNG THÁNG
                  </h2>
                </div>
                <div className="p-6">
                  {stats!.monthly_stats.length === 0 ? (
                    <p className="text-[#9CA3AF] text-center py-8" style={{ fontSize: '13px' }}>
                      Chưa có dữ liệu hàng tháng
                    </p>
                  ) : (
                    <div className="h-48 flex items-end gap-2 border-l border-b border-[#E5E7EB] pl-2 pb-2">
                      {stats!.monthly_stats.map((d, idx) => {
                        const h = maxUsers > 0 ? (d.users / maxUsers) * 100 : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end" style={{ height: '160px' }}>
                              <div
                                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors relative group cursor-pointer"
                                style={{ height: `${Math.max(h, 2)}%` }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111827] text-white px-2 py-1 whitespace-nowrap z-10" style={{ fontSize: '11px' }}>
                                  {d.users} người dùng
                                </div>
                              </div>
                            </div>
                            <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{d.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Chart */}
              <div className="border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                  <h2 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '15px' }}>
                    TƯƠNG TÁC NGƯỜI DÙNG HÀNG THÁNG
                  </h2>
                </div>
                <div className="p-6">
                  {stats!.monthly_stats.length === 0 ? (
                    <p className="text-[#9CA3AF] text-center py-8" style={{ fontSize: '13px' }}>
                      Chưa có dữ liệu tương tác
                    </p>
                  ) : (
                    <div className="h-48 flex items-end gap-2 border-l border-b border-[#E5E7EB] pl-2 pb-2">
                      {stats!.monthly_stats.map((d, idx) => {
                        const h = maxActions > 0 ? (d.actions / maxActions) * 100 : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end" style={{ height: '160px' }}>
                              <div
                                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors relative group cursor-pointer"
                                style={{ height: `${Math.max(h, 2)}%` }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111827] text-white px-2 py-1 whitespace-nowrap z-10" style={{ fontSize: '11px' }}>
                                  {d.actions} tương tác
                                </div>
                              </div>
                            </div>
                            <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{d.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Activity Logs */}
            <div className="border border-[#E5E7EB]">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center justify-between">
                <h2 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '15px' }}>
                  HOẠT ĐỘNG HỆ THỐNG GẦN ĐÂY
                </h2>
                <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  {stats!.recent_logs.length} sự kiện gần đây
                </span>
              </div>

              {stats!.recent_logs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#9CA3AF]" style={{ fontSize: '14px' }}>
                    Chưa có nhật ký hoạt động — hệ thống đã sẵn sàng.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-white">
                        {['THỜI GIAN', 'SỰ KIỆN', 'SÁCH', 'NGƯỜI DÙNG', 'TRẠNG THÁI'].map((h) => (
                          <th
                            key={h}
                            className="px-6 py-3 text-left text-[#6B7280]"
                            style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#F3F4F6]">
                      {stats!.recent_logs.map((log, idx) => {
                        const isSuccess = log.status === 'success';
                        const StatusIcon = isSuccess ? CheckCircle : log.status === 'warning' ? AlertCircle : Clock;
                        const statusColor = isSuccess ? '#059669' : log.status === 'warning' ? '#D97706' : '#2563EB';
                        return (
                          <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-6 py-3">
                              <span className="text-[#9CA3AF]" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                {log.timestamp}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-[#111827]" style={{ fontSize: '13px', fontWeight: 600 }}>
                                {log.event}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-[#6B7280] line-clamp-1" style={{ fontSize: '12px', maxWidth: '150px', display: 'block' }}>
                                {log.book || '—'}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>
                                {log.user}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon size={13} style={{ color: statusColor }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor }}>
                                  {log.status.toUpperCase()}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
            )}
          </>
        ) : activeTab === 'users' ? (
          <div>
            <h2 className="text-xl font-bold mb-4 text-[#111827]">Quản Lý Người Dùng</h2>
            {loadingUsers ? (
              <p>Đang tải danh sách người dùng...</p>
            ) : (
              <div className="overflow-x-auto border border-[#E5E7EB]">
                <table className="w-full text-left">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Tên người dùng</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Vai trò</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Trạng thái</th>
                      <th className="px-6 py-3 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Ngày tham gia</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E5E7EB]">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#111827]">{u.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4B5563]">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4B5563]">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="border border-[#D1D5DB] p-1 text-sm rounded bg-white"
                          >
                            <option value="reader">Người đọc</option>
                            <option value="staff">Nhân viên</option>
                            <option value="admin">Quản trị viên</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4B5563]">{u.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4B5563]">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'ai' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {loadingAi ? (
              <div className="flex justify-center py-24"><Loader2 size={36} className="animate-spin text-[#2563EB]" /></div>
            ) : (
              <>
                <div className="flex justify-between items-center bg-[#F9FAFB] p-6 border border-[#E5E7EB]">
                  <div>
                    <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                      <Brain className="text-[#2563EB]" /> Phiên bản Mô hình AI: <span className="text-[#2563EB]">{aiConfig?.version}</span>
                    </h2>
                    <p className="text-[#6B7280] text-sm mt-1">Cập nhật lần cuối: {aiConfig?.last_retrained ? new Date(aiConfig.last_retrained).toLocaleString('vi-VN') : 'N/A'}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={exportAiReport} className="flex items-center gap-2 border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#4B5563] hover:text-[#111827] hover:border-[#111827] transition-colors">
                      <Download size={16} /> Xuất Báo cáo JSON
                    </button>
                    <button onClick={handleRetrain} disabled={retraining} className="flex items-center gap-2 bg-[#111827] text-white px-6 py-2 text-sm font-bold hover:bg-black transition-colors disabled:opacity-50">
                      {retraining ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      Huấn luyện lại Mô hình
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* AI Config Form */}
                  <div className="border border-[#E5E7EB] bg-white">
                    <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center gap-2">
                      <Settings size={18} className="text-[#7C3AED]" />
                      <h3 className="font-extrabold text-[14px] text-[#111827]">CẤU HÌNH THAM SỐ AI</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider block mb-2">Trọng số Alpha (Content-Based vs Collaborative Filtering)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" 
                            min="0" max="1" step="0.05" 
                            value={alpha} 
                            onChange={(e) => setAlpha(parseFloat(e.target.value))}
                            className="flex-1 accent-[#7C3AED]" 
                          />
                          <span className="font-bold text-[#7C3AED] w-12 text-right">{alpha.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#9CA3AF] mt-1 font-bold">
                          <span>0.0 (100% CF)</span>
                          <span>1.0 (100% CB)</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[12px] font-bold text-[#111827] uppercase tracking-wider block mb-2">Số lượng gợi ý (Top N)</label>
                        <input 
                          type="number" min="1" max="50" 
                          value={topN} 
                          onChange={(e) => setTopN(parseInt(e.target.value))}
                          className="w-full border border-[#E5E7EB] px-4 py-2 focus:outline-none focus:border-[#7C3AED]" 
                        />
                      </div>

                      <button 
                        onClick={handleSaveAiConfig} 
                        disabled={savingAi}
                        className="w-full bg-[#7C3AED] text-white py-3 font-bold text-sm hover:bg-[#6D28D9] transition-colors flex justify-center items-center gap-2"
                      >
                        {savingAi ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        LƯU CẤU HÌNH
                      </button>
                    </div>
                  </div>

                  {/* AI Performance Metrics */}
                  <div className="border border-[#E5E7EB] bg-white">
                    <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center gap-2">
                      <BarChart2 size={18} className="text-[#059669]" />
                      <h3 className="font-extrabold text-[14px] text-[#111827]">KIỂM TRA HIỆU SUẤT AI</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-[#E5E7EB] p-4 bg-[#F9FAFB] text-center">
                          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">RMSE (Độ lệch chuẩn)</p>
                          <p className="text-2xl font-extrabold text-[#111827]">{aiPerf?.current_metrics.rmse.toFixed(3)}</p>
                        </div>
                        <div className="border border-[#E5E7EB] p-4 bg-[#F9FAFB] text-center">
                          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Precision@K</p>
                          <p className="text-2xl font-extrabold text-[#059669]">{((aiPerf?.current_metrics.precision_at_k || 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="border border-[#E5E7EB] p-4 bg-[#F9FAFB] text-center">
                          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Recall@K</p>
                          <p className="text-2xl font-extrabold text-[#2563EB]">{((aiPerf?.current_metrics.recall_at_k || 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div className="border border-[#E5E7EB] p-4 bg-[#F9FAFB] text-center">
                          <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">F1 Score</p>
                          <p className="text-2xl font-extrabold text-[#7C3AED]">{aiPerf?.current_metrics.f1_score.toFixed(3)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <p className="text-[12px] font-bold text-[#111827] uppercase tracking-wider mb-3">Thông tin chi tiết</p>
                        <div className="flex justify-between text-sm py-2 border-b border-[#F3F4F6]">
                          <span className="text-[#6B7280]">Training Loss (Loss trong lúc huấn luyện):</span>
                          <span className="font-bold">{aiPerf?.current_metrics.training_loss.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm py-2">
                          <span className="text-[#6B7280]">Validation Loss (Loss đánh giá):</span>
                          <span className="font-bold">{aiPerf?.current_metrics.validation_loss.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'revenue' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="border border-[#E5E7EB] bg-white p-8 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Tổng doanh thu hệ thống</p>
                <p className="text-4xl font-extrabold text-[#111827]">{(revenueStats?.total_revenue || 0).toLocaleString('vi-VN')}₫</p>
              </div>
              <button onClick={() => {
                const csv = "Tháng,Doanh thu\n" + revenueStats?.revenue_history.map(r => `${r.month},${r.revenue}`).join("\n");
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'bao_cao_doanh_thu.csv'; a.click();
              }} className="bg-[#111827] text-white px-6 py-3 font-bold text-sm hover:bg-black transition-colors flex items-center gap-2">
                <FileText size={18} /> XUẤT BÁO CÁO (CSV)
              </button>
            </div>
            
            <div className="border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                <h3 className="font-extrabold text-[14px] text-[#111827]">BIỂU ĐỒ DOANH THU THEO THÁNG</h3>
              </div>
              <div className="p-10">
                <div className="h-64 flex items-end gap-4 border-l border-b border-[#E5E7EB] pl-4 pb-4">
                  {revenueStats?.revenue_history.map((r, idx) => {
                    const maxRev = Math.max(...revenueStats.revenue_history.map(h => h.revenue), 1);
                    const h = (r.revenue / maxRev) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-[#059669] hover:bg-[#047857] transition-all relative group" style={{ height: `${Math.max(h, 5)}%` }}>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-1 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {r.revenue.toLocaleString()}₫
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#6B7280]">{r.month}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-4 gap-4">
              <div className="border border-[#E5E7EB] bg-white p-6">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Đầu sách</p>
                <p className="text-3xl font-extrabold text-[#111827]">{invStats?.total_books || 0}</p>
              </div>
              <div className="border border-[#E5E7EB] bg-white p-6">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Tổng tồn kho</p>
                <p className="text-3xl font-extrabold text-[#111827]">{invStats?.total_stock || 0}</p>
              </div>
              <div className="border border-[#E5E7EB] bg-white p-6">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Giá trị kho</p>
                <p className="text-3xl font-extrabold text-[#2563EB]">{invStats?.total_value.toLocaleString('vi-VN')}₫</p>
              </div>
              <div className="border border-red-100 bg-red-50 p-6">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">Sắp hết</p>
                <p className="text-3xl font-extrabold text-red-700">{invStats?.low_stock_count || 0}</p>
              </div>
            </div>

            <div className="border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex justify-between items-center">
                <h3 className="font-extrabold text-[14px] text-[#111827]">CHI TIẾT KHO THEO THỂ LOẠI</h3>
                <button onClick={() => {
                  const csv = "Thể loại,Đầu sách,Số lượng bản\n" + invStats?.category_distribution.map(c => `${c.category},${c.book_count},${c.stock_count}`).join("\n");
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'bao_cao_kho.csv'; a.click();
                }} className="bg-[#111827] text-white px-4 py-2 text-xs font-bold hover:bg-black transition-colors">XUẤT BÁO CÁO</button>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#6B7280] border-b">
                      <th className="pb-3">THỂ LOẠI</th>
                      <th className="pb-3">SỐ ĐẦU SÁCH</th>
                      <th className="pb-3 text-right">TỔNG SỐ BẢN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invStats?.category_distribution.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB]">
                        <td className="py-3 font-bold">{cat.category}</td>
                        <td className="py-3">{cat.book_count}</td>
                        <td className="py-3 text-right font-extrabold text-[#2563EB]">{cat.stock_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'system' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-8">
              <div className="border border-[#E5E7EB] bg-white p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-[#EFF6FF] text-[#2563EB]"><Database size={24} /></div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">Sao lưu Hệ thống</h3>
                    <p className="text-sm text-[#6B7280]">Tạo bản sao lưu CSDL và cấu hình AI</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    setCreatingBackup(true);
                    try {
                      const res = await createBackup();
                      alert(res.message);
                      fetchBackups();
                    } catch (err: any) { alert(err.response?.data?.detail || "Lỗi sao lưu"); }
                    finally { setCreatingBackup(false); }
                  }}
                  disabled={creatingBackup}
                  className="w-full bg-[#2563EB] text-white py-4 font-bold hover:bg-[#1D4ED8] transition-colors flex justify-center items-center gap-2"
                >
                  {creatingBackup ? <Loader2 className="animate-spin" /> : <Shield size={18} />}
                  TẠO BẢN SAO LƯU NGAY
                </button>
              </div>

              <div className="border border-[#E5E7EB] bg-white p-8">
                <h3 className="font-bold text-[#111827] mb-4">Các bản sao lưu hiện có</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {backups.length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Chưa có bản sao lưu nào</p> : 
                    backups.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-[#F3F4F6] hover:bg-[#F9FAFB]">
                        <div className="flex items-center gap-3">
                          <Clock size={14} className="text-[#9CA3AF]" />
                          <div>
                            <p className="text-xs font-bold text-[#111827]">{b.filename}</p>
                            <p className="text-[10px] text-[#6B7280]">{Math.round(b.size/1024)} KB · {new Date(b.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <button className="text-[#2563EB] text-xs font-bold hover:underline">TẢI VỀ</button>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
