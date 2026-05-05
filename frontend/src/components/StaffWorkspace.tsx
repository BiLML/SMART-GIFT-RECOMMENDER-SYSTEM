import { Upload, Sparkles, Plus, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, BookOpen, MessageCircle, Send } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createBook, getBooks, deleteBook, updateBook, getInventoryStats, type Book, type InventoryStats } from '@/api/books';
import { getAllOrders, updateOrderStatus, type Order } from '@/api/orders';
import { getConversations, getMessages, sendMessage, closeConversation, type Conversation, type ChatMessage } from '@/api/chat';
import { getAllUsers, notifyUsers, type UserInfo } from '@/api/users';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'Technology', 'Philosophy',
  'History', 'Biography', 'Self-Help', 'Business', 'Art & Design',
  'Children', 'Travel', 'Health', 'Politics', 'Religion',
];

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop',
];

export function StaffWorkspace() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'books' | 'orders' | 'chat' | 'users' | 'inventory'>('books');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifying, setNotifying] = useState(false);

  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  
  // Chat state
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [stock, setStock] = useState('');

  // Load existing books
  const loadBooks = async () => {
    try {
      const data = await getBooks(0, 50);
      setBooks(data);
    } catch {
      // backend not connected yet
    } finally {
      setLoadingBooks(false);
    }
  };

  useEffect(() => { 
    if (activeTab === 'books') {
      loadBooks(); 
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'chat') {
      loadConversations();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'inventory') {
      loadInventoryStats();
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [activeTab]);

  // Chat functions
  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {}
  };

  const loadChatMessages = async (convId: number) => {
    try {
      const data = await getMessages(convId);
      setChatMessages(data);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv);
    loadChatMessages(conv.id);
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    chatPollRef.current = setInterval(() => {
      loadChatMessages(conv.id);
      loadConversations();
    }, 3000);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !activeConv || chatSending) return;
    setChatSending(true);
    try {
      await sendMessage(activeConv.id, chatInput.trim());
      setChatInput('');
      await loadChatMessages(activeConv.id);
    } catch {}
    setChatSending(false);
  };

  const handleCloseConv = async (convId: number) => {
    try {
      await closeConversation(convId);
      showToast('success', 'Đã đóng cuộc hội thoại');
      loadConversations();
      if (activeConv?.id === convId) setActiveConv(null);
    } catch { showToast('error', 'Lỗi khi đóng cuộc hội thoại'); }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch {
      showToast('error', 'Lỗi khi tải đơn hàng');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      showToast('success', `Đơn hàng #${orderId} được cập nhật thành ${status}`);
      loadOrders();
    } catch {
      showToast('error', 'Lỗi khi cập nhật trạng thái đơn hàng');
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      showToast('error', 'Không thể tải danh sách người dùng');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSendNotification = async () => {
    if (selectedUserIds.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất một người dùng');
      return;
    }
    if (!notifySubject.trim() || !notifyBody.trim()) {
      showToast('error', 'Tiêu đề và nội dung không được để trống');
      return;
    }

    setNotifying(true);
    try {
      const res = await notifyUsers(selectedUserIds, notifySubject, notifyBody);
      showToast('success', res.message);
      if (res.errors.length > 0) {
        console.error('Notification errors:', res.errors);
      }
      setNotifySubject('');
      setNotifyBody('');
      setSelectedUserIds([]);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Lỗi khi gửi thông báo');
    } finally {
      setNotifying(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadInventoryStats = async () => {
    setLoadingInv(true);
    try {
      const data = await getInventoryStats();
      setInvStats(data);
    } catch {
      showToast('error', 'Không thể tải thống kê kho');
    } finally {
      setLoadingInv(false);
    }
  };

  const exportToCSV = () => {
    if (!books.length) return;
    const headers = ['ID', 'Tiêu đề', 'Tác giả', 'Thể loại', 'Giá', 'Tồn kho'];
    const rows = books.map(b => [b.id, b.title, b.author, b.category, b.price, b.stock]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_kho_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      showToast('error', 'Tên sách và Tác giả là bắt buộc.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingBook) {
        await updateBook(editingBook.id, {
          title: title.trim(),
          author: author.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          cover_url: coverUrl.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          stock: stock ? parseInt(stock) : undefined,
        });
        showToast('success', `Cập nhật "${title}" thành công!`);
        setEditingBook(null);
      } else {
        await createBook({
          title: title.trim(),
          author: author.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          cover_url: coverUrl.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          stock: stock ? parseInt(stock) : undefined,
        });
        showToast('success', `Đã xuất bản "${title}"!`);
      }
      // Reset form
      setTitle(''); setAuthor(''); setDescription('');
      setCategory(''); setPrice(''); setCoverUrl(''); setStock('');
      // Reload book list
      loadBooks();
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Lỗi xử lý sách.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setDescription(book.description || '');
    setCategory(book.category || '');
    setPrice(book.price?.toString() || '');
    setCoverUrl(book.cover_url || '');
    setStock(book.stock?.toString() || '');
    setActiveTab('books');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${book.title}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteBook(book.id);
      showToast('success', `Đã xóa "${book.title}".`);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch {
      showToast('error', 'Lỗi khi xóa. Bạn có thể không có quyền.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl p-12">
        <div className="mb-10 border-b border-[#E5E7EB] pb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[#111827] mb-2" style={{ fontWeight: 800, fontSize: '36px' }}>
              Không Gian Làm Việc
            </h1>
            <p className="text-[#4B5563]" style={{ fontSize: '16px' }}>
              Thêm và quản lý sách trong hệ thống LUMINA
            </p>
          </div>
          <div className="flex items-center gap-2 border border-[#2563EB] bg-[#EFF6FF] px-3 py-2">
            <div className="size-2 bg-[#2563EB] animate-pulse" />
            <span className="text-[#2563EB]" style={{ fontSize: '12px', fontWeight: 700 }}>
              {books.length} sách trong hệ thống
            </span>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 border shadow-lg transition-all ${
              toast.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{toast.msg}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#E5E7EB] mb-8">
          <button
            onClick={() => setActiveTab('books')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'books' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            Quản Lý Sách
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'orders' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            Quản Lý Đơn Hàng
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            <MessageCircle size={16} /> Hỗ Trợ Khách Hàng
            {conversations.filter(c => c.unread_count > 0).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {conversations.filter(c => c.unread_count > 0).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'users' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            Quản Lý Độc Giả
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 px-6 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'inventory' ? 'border-[#111827] text-[#111827]' : 'border-transparent text-[#6B7280] hover:text-[#111827]'}`}
          >
            Kho Hàng & Báo Cáo
          </button>
        </div>

        {activeTab === 'books' && (
        <div className="grid grid-cols-12 gap-8">
          {/* Left: Add Book Form */}
          <div className="col-span-5">
            <div className="border border-[#E5E7EB] bg-white sticky top-8">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus size={18} className="text-[#2563EB]" />
                  <h2 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '16px' }}>
                    {editingBook ? 'CHỈNH SỬA SÁCH' : 'THÊM SÁCH MỚI'}
                  </h2>
                </div>
                {editingBook && (
                  <button onClick={() => { setEditingBook(null); setTitle(''); setAuthor(''); setDescription(''); setCategory(''); setPrice(''); setCoverUrl(''); setStock(''); }} className="text-xs text-[#6B7280] hover:text-[#111827] font-bold">HỦY EDIT</button>
                )}
              </div>
              <div className="p-6">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {/* Title */}
                  <div>
                    <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Tên sách *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      placeholder="Nhập tên sách"
                      style={{ fontSize: '14px' }}
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Tác giả *
                    </label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      required
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      placeholder="Nhập tên tác giả"
                      style={{ fontSize: '14px' }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Thể loại
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      style={{ fontSize: '14px' }}
                    >
                      <option value="">Chọn một thể loại</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price & Stock */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Giá (VNĐ)</label>
                      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="e.g. 120000" style={{ fontSize: '14px' }} />
                    </div>
                    <div>
                      <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tồn kho</label>
                      <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]" placeholder="10" style={{ fontSize: '14px' }} />
                    </div>
                  </div>

                  {/* Cover URL */}
                  <div>
                    <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      URL Ảnh Bìa
                    </label>
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      placeholder="https://..."
                      style={{ fontSize: '14px' }}
                    />
                    {coverUrl && (
                      <div className="mt-2 border border-[#E5E7EB] overflow-hidden" style={{ height: '80px', width: '60px' }}>
                        <img
                          src={coverUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COVERS[0]; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[#111827] mb-1.5 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Mô tả
                    </label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                      placeholder="Nhập mô tả sách — nội dung này sẽ được AI sử dụng cho tìm kiếm ngữ nghĩa"
                      style={{ fontSize: '14px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#2563EB] py-4 text-white hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ fontWeight: 700, fontSize: '15px' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Đang xuất bản...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        {editingBook ? 'CẬP NHẬT THÔNG TIN' : 'XUẤT BẢN SÁCH'}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right: Book List */}
          <div className="col-span-7">
            <div className="border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center gap-2">
                <BookOpen size={18} className="text-[#4B5563]" />
                <h2 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '16px' }}>
                  DANH MỤC ({books.length})
                </h2>
              </div>

              {loadingBooks ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-[#2563EB]" />
                </div>
              ) : books.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Upload size={32} className="text-[#D1D5DB]" />
                  <p className="text-[#9CA3AF]" style={{ fontSize: '14px' }}>
                    Chưa có sách nào. Hãy thêm sách mới.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {books.map((book, idx) => (
                    <div key={book.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F9FAFB] transition-colors">
                      {/* Cover thumbnail */}
                      <div className="flex-shrink-0 border border-[#E5E7EB] overflow-hidden" style={{ width: '40px', height: '56px' }}>
                        <img
                          src={book.cover_url || FALLBACK_COVERS[idx % FALLBACK_COVERS.length]}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_COVERS[0]; }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#111827] truncate" style={{ fontWeight: 700, fontSize: '13px' }}>
                          {book.title}
                        </p>
                        <p className="text-[#6B7280] truncate" style={{ fontSize: '12px' }}>
                          {book.author}
                          {book.category && ` Â· ${book.category}`}
                        </p>
                        {book.price != null && book.price > 0 && (
                          <p className="text-[#2563EB]" style={{ fontSize: '12px', fontWeight: 600 }}>
                            {book.price.toLocaleString('vi-VN')}â‚«
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="border border-[#E5E7EB] bg-white px-2 py-0.5 text-[#6B7280]"
                          style={{ fontSize: '11px' }}
                        >
                          #{book.id}
                        </span>
                        <button
                          onClick={() => startEdit(book)}
                          className="border border-[#E5E7EB] p-1.5 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(book)}
                          className="border border-[#E5E7EB] p-1.5 text-[#4B5563] hover:border-red-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-[#111827]">Quản Lý Đơn Hàng</h2>
            {loadingOrders ? (
              <p>Đang tải đơn hàng...</p>
            ) : orders.length === 0 ? (
              <p>Không tìm thấy đơn hàng.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {orders.map(order => (
                  <div key={order.id} className="border border-[#E5E7EB] p-6 bg-[#F9FAFB]">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                      <div>
                        <h3 className="font-bold text-[#111827]">Đơn hàng #{order.id}</h3>
                        <p className="text-sm text-[#4B5563]">{order.user_email || 'Người dùng ẩn danh'}</p>
                        <p className="text-xs text-[#6B7280]">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#2563EB] text-lg">{order.total_amount.toLocaleString('vi-VN')}₫</p>
                        <div className="flex items-center gap-2 mt-2">
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="border p-1 text-sm bg-white"
                          >
                            <option value="Pending">Chờ xử lý</option>
                            <option value="Paid">Đã thanh toán</option>
                            <option value="Shipped">Đã giao</option>
                            <option value="Cancelled">Đã hủy</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    {/* Items are not returned by admin endpoint yet in our API, but this is fine for now */}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 300px)' }}>
            {/* Left: Conversation list */}
            <div className="col-span-4 border border-[#E5E7EB] bg-white overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                <h3 className="font-extrabold text-[14px] text-[#111827]">CUỘC HỘI THOẠI ({conversations.length})</h3>
              </div>
              {conversations.length === 0 ? (
                <div className="text-center py-12 text-[#9CA3AF]">
                  <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có cuộc hội thoại nào</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      className={`w-full text-left px-4 py-3 hover:bg-[#F9FAFB] transition-colors ${
                        activeConv?.id === conv.id ? 'bg-[#EFF6FF] border-l-4 border-l-[#2563EB]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#111827] text-[13px] truncate flex-1">{conv.reader_name}</span>
                        {conv.unread_count > 0 && (
                          <span className="bg-[#2563EB] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[#6B7280] text-[12px] font-medium mb-1">{conv.subject}</p>
                      <p className="text-[#9CA3AF] text-[11px] truncate">{conv.last_message || 'Chưa có tin nhắn'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 ${conv.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {conv.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Chat messages */}
            <div className="col-span-8 border border-[#E5E7EB] bg-white flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {!activeConv ? (
                <div className="flex-1 flex items-center justify-center text-[#9CA3AF]">
                  <div className="text-center">
                    <MessageCircle size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Chọn một cuộc hội thoại để bắt đầu trả lời</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#111827] text-[14px]">{activeConv.reader_name} — {activeConv.subject}</h4>
                      <p className="text-[#9CA3AF] text-[11px]">ID: #{activeConv.id}</p>
                    </div>
                    {activeConv.status === 'open' && (
                      <button
                        onClick={() => handleCloseConv(activeConv.id)}
                        className="border border-[#E5E7EB] text-[#6B7280] hover:text-red-500 hover:border-red-300 px-3 py-1.5 text-[12px] font-bold transition-colors"
                      >
                        Đóng hội thoại
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FAFAFA]">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-[#9CA3AF] text-sm py-8">Chưa có tin nhắn</p>
                    )}
                    {chatMessages.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2.5 ${
                            isMe
                              ? 'bg-[#2563EB] text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                              : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-xl rounded-tr-xl rounded-br-xl'
                          }`}>
                            {!isMe && <p className="text-[10px] font-bold text-[#2563EB] mb-1">{msg.sender_name}</p>}
                            <p className="text-[13px] leading-relaxed">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-[#9CA3AF]'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  {activeConv.status === 'open' ? (
                    <div className="border-t border-[#E5E7EB] p-3 flex gap-2 bg-white">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="Nhập tin nhắn trả lời..."
                        className="flex-1 border border-[#E5E7EB] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={chatSending || !chatInput.trim()}
                        className="bg-[#2563EB] text-white px-4 py-2.5 hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {chatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        <span className="text-[13px] font-bold">Gửi</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border-t border-[#E5E7EB] p-3 bg-[#F9FAFB] text-center">
                      <p className="text-[#9CA3AF] text-sm">Cuộc hội thoại đã đóng</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-12 gap-8">
            {/* Left: User List */}
            <div className="col-span-7">
              <div className="border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-[14px] text-[#111827]">DANH SÁCH ĐỘC GIẢ ({users.length})</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedUserIds(users.map(u => u.id))}
                      className="text-[11px] font-bold text-[#2563EB] hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <button 
                      onClick={() => setSelectedUserIds([])}
                      className="text-[11px] font-bold text-[#6B7280] hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
                {loadingUsers ? (
                  <div className="p-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[#2563EB]" /></div>
                ) : (
                  <div className="divide-y divide-[#E5E7EB] overflow-y-auto max-h-[600px]">
                    {users.map(u => (
                      <div key={u.id} className="p-4 flex items-center gap-4 hover:bg-[#F9FAFB]">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUserIds([...selectedUserIds, u.id]);
                            else setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                          }}
                          className="size-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#111827] text-sm truncate">{u.username}</p>
                          <p className="text-[#6B7280] text-xs truncate">{u.email || 'Không có email'}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Notification Form */}
            <div className="col-span-5">
              <div className="border border-[#E5E7EB] bg-white sticky top-8">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center gap-2">
                  <Send size={18} className="text-[#2563EB]" />
                  <h3 className="font-extrabold text-[14px] text-[#111827]">GỬI THÔNG BÁO EMAIL</h3>
                </div>
                <div className="p-6">
                  <div className="mb-4 p-3 bg-[#EFF6FF] border border-[#DBEAFE] rounded text-[12px] text-[#1E40AF]">
                    Đang chọn: <strong>{selectedUserIds.length}</strong> người dùng
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Tiêu đề email</label>
                      <input
                        value={notifySubject}
                        onChange={(e) => setNotifySubject(e.target.value)}
                        placeholder="Ví dụ: Chào mừng bạn quay trở lại LUMINA"
                        className="w-full border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">Nội dung thông báo</label>
                      <textarea
                        value={notifyBody}
                        onChange={(e) => setNotifyBody(e.target.value)}
                        rows={8}
                        placeholder="Nhập nội dung email tại đây..."
                        className="w-full border border-[#E5E7EB] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                      />
                    </div>
                    <button
                      onClick={handleSendNotification}
                      disabled={notifying || selectedUserIds.length === 0}
                      className="w-full bg-[#111827] text-white py-4 font-bold text-[14px] hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {notifying ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      {notifying ? 'ĐANG GỬI...' : 'GỬI THÔNG BÁO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="border border-[#E5E7EB] bg-white p-6">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Tổng số đầu sách</p>
                <p className="text-3xl font-extrabold text-[#111827]">{invStats?.total_books || 0}</p>
              </div>
              <div className="border border-[#E5E7EB] bg-white p-6">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Tổng số lượng tồn</p>
                <p className="text-3xl font-extrabold text-[#111827]">{invStats?.total_stock || 0}</p>
              </div>
              <div className="border border-[#E5E7EB] bg-white p-6">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Tổng giá trị kho</p>
                <p className="text-3xl font-extrabold text-[#2563EB]">{invStats?.total_value?.toLocaleString('vi-VN')}₫</p>
              </div>
              <div className="border border-red-100 bg-red-50 p-6">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">Sách sắp hết ({"<5"})</p>
                <p className="text-3xl font-extrabold text-red-700">{invStats?.low_stock_count || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Category distribution */}
              <div className="col-span-8 border border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4 flex items-center justify-between">
                  <h3 className="font-extrabold text-[14px] text-[#111827]">PHÂN BỔ THEO THỂ LOẠI</h3>
                  <button onClick={exportToCSV} className="bg-[#111827] text-white px-4 py-2 text-xs font-bold hover:bg-black transition-colors flex items-center gap-2">
                    XUẤT BÁO CÁO (CSV)
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {invStats?.category_distribution.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-[#F3F4F6] hover:border-[#E5E7EB] transition-colors">
                        <div>
                          <p className="font-bold text-sm text-[#111827]">{cat.category}</p>
                          <p className="text-xs text-[#6B7280]">{cat.book_count} đầu sách</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#2563EB]">{cat.stock_count} bản</p>
                          <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Tổng tồn kho</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Low stock items */}
              <div className="col-span-4 border border-red-200 bg-white">
                <div className="border-b border-red-200 bg-red-50 px-6 py-4">
                  <h3 className="font-extrabold text-[14px] text-red-700">CẢNH BÁO TỒN KHO THẤP</h3>
                </div>
                <div className="p-6">
                  {!invStats?.low_stock_items || invStats.low_stock_items.length === 0 ? (
                    <p className="text-sm text-[#6B7280] text-center py-4">Mọi thứ đều ổn!</p>
                  ) : (
                    <div className="space-y-3">
                      {invStats.low_stock_items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-red-50/50 border border-red-100">
                          <p className="text-xs font-bold text-[#111827] truncate flex-1 pr-4">{item.title}</p>
                          <span className="text-sm font-extrabold text-red-700">{item.stock}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
