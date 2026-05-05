import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  type Conversation,
  type ChatMessage,
} from '@/api/chat';

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Only show for readers
  if (!user || user.role !== 'reader') return null;

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {}
  };

  const loadMessages = async (convId: number) => {
    try {
      const data = await getMessages(convId);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  useEffect(() => {
    if (open) {
      loadConversations();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (activeConv && open) {
      loadMessages(activeConv.id);
      pollRef.current = setInterval(() => {
        loadMessages(activeConv.id);
        loadConversations();
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConv, open]);

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      await sendMessage(activeConv.id, input.trim());
      setInput('');
      await loadMessages(activeConv.id);
    } catch {}
    setSending(false);
  };

  const handleNewConversation = async () => {
    setLoading(true);
    try {
      const conv = await createConversation(newSubject || 'Hỗ trợ chung');
      setNewSubject('');
      setShowNewChat(false);
      await loadConversations();
      setActiveConv(conv);
    } catch {}
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 bg-[#2563EB] text-white p-4 rounded-full shadow-2xl hover:bg-[#1D4ED8] transition-all hover:scale-110"
        style={{ width: 60, height: 60 }}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalUnread}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 bg-white border border-[#E5E7EB] shadow-2xl flex flex-col"
          style={{ width: 380, height: 520, borderRadius: 12, overflow: 'hidden' }}
        >
          {/* Header */}
          <div className="bg-[#2563EB] text-white px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[15px]">
                {activeConv ? activeConv.subject : 'Hỗ trợ khách hàng'}
              </h3>
              <p className="text-blue-200 text-[11px]">
                {activeConv ? `Nhân viên: ${activeConv.staff_name}` : 'Chúng tôi sẵn sàng giúp bạn'}
              </p>
            </div>
            {activeConv && (
              <button onClick={() => setActiveConv(null)} className="text-blue-200 hover:text-white">
                ← Quay lại
              </button>
            )}
          </div>

          {!activeConv ? (
            /* Conversation List */
            <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                <button
                  onClick={() => setShowNewChat(!showNewChat)}
                  className="w-full flex items-center gap-2 p-3 border border-dashed border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors mb-3"
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  <Plus size={16} /> Tạo cuộc hội thoại mới
                </button>

                {showNewChat && (
                  <div className="mb-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB]">
                    <input
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Chủ đề (VD: Hỏi về sách...)"
                      className="w-full border border-[#E5E7EB] px-3 py-2 text-sm mb-2"
                    />
                    <button
                      onClick={handleNewConversation}
                      disabled={loading}
                      className="w-full bg-[#2563EB] text-white py-2 text-sm font-bold hover:bg-[#1D4ED8] disabled:opacity-50"
                    >
                      {loading ? 'Đang tạo...' : 'Bắt đầu chat'}
                    </button>
                  </div>
                )}
              </div>

              {conversations.length === 0 ? (
                <div className="text-center py-12 text-[#9CA3AF]">
                  <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Chưa có cuộc hội thoại nào</p>
                  <p className="text-xs mt-1">Tạo mới để được hỗ trợ</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConv(conv)}
                      className="w-full text-left px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#111827] text-[13px] truncate flex-1">{conv.subject}</span>
                        {conv.unread_count > 0 && (
                          <span className="bg-[#2563EB] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[#6B7280] text-[11px] truncate">{conv.last_message || 'Chưa có tin nhắn'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 ${conv.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                          {conv.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">{conv.staff_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Messages */
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FAFB]">
                {messages.length === 0 && (
                  <p className="text-center text-[#9CA3AF] text-sm py-8">Bắt đầu cuộc trò chuyện...</p>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] px-4 py-2.5 ${
                          isMe
                            ? 'bg-[#2563EB] text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                            : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-xl rounded-tr-xl rounded-br-xl'
                        }`}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-bold text-[#2563EB] mb-1">{msg.sender_name}</p>
                        )}
                        <p className="text-[13px] leading-relaxed">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-[#9CA3AF]'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {activeConv.status === 'open' ? (
                <div className="border-t border-[#E5E7EB] p-3 flex gap-2 bg-white">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 border border-[#E5E7EB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] rounded-lg"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="bg-[#2563EB] text-white p-2 rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
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
      )}
    </>
  );
}
