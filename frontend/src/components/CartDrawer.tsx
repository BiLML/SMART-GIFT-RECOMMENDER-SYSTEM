import { X, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();

  if (!open) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="border-b border-[#E5E7EB] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} className="text-[#2563EB]" />
            <h2 className="text-[#111827]" style={{ fontWeight: 800, fontSize: 18 }}>
              Giỏ hàng ({cartCount})
            </h2>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart size={48} className="mx-auto mb-4 text-[#D1D5DB]" />
              <p className="text-[#9CA3AF] text-[15px] mb-2">Giỏ hàng trống</p>
              <p className="text-[#D1D5DB] text-[13px]">Khám phá sách và thêm vào giỏ hàng</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.book_id} className="flex gap-4 p-4 border border-[#E5E7EB] bg-[#F9FAFB]">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[#111827] font-bold text-[13px] line-clamp-2 leading-tight mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[#6B7280] text-[11px] truncate mb-2">
                      {item.author}
                    </p>
                    <p className="text-[#2563EB] font-bold text-[14px]">
                      {item.price.toLocaleString('vi-VN')}đ
                    </p>
                  </div>

                  {/* Quantity + Delete */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.book_id)}
                      className="text-[#D1D5DB] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-2 border border-[#E5E7EB] bg-white">
                      <button
                        onClick={() => updateQuantity(item.book_id, item.quantity - 1)}
                        className="p-1.5 text-[#6B7280] hover:text-[#111827]"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-[#111827] font-bold text-[13px] min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.book_id, item.quantity + 1)}
                        className="p-1.5 text-[#6B7280] hover:text-[#111827]"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#E5E7EB] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] font-bold text-[13px]">TỔNG CỘNG</span>
              <span className="text-[#111827] font-bold text-[20px]">
                {cartTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-[#2563EB] text-white py-4 font-bold text-[15px] hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
            >
              Tiến hành thanh toán →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
      `}</style>
    </>
  );
}
