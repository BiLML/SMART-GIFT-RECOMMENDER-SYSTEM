import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CreditCard, Truck, Wallet, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { createOrder, validateDiscount } from '@/api/orders';
import client from '@/api/client';
import { Tag } from 'lucide-react';

type PaymentMethod = 'COD' | 'Banking' | 'E-Wallet';

const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string; icon: typeof CreditCard }[] = [
  { id: 'COD', label: 'Thanh toán khi nhận hàng', desc: 'Trả tiền mặt khi giao sách', icon: Truck },
  { id: 'Banking', label: 'Chuyển khoản ngân hàng', desc: 'Thanh toán qua Internet Banking', icon: CreditCard },
  { id: 'E-Wallet', label: 'Ví điện tử', desc: 'MoMo, ZaloPay, VNPay...', icon: Wallet },
];

interface PaymentResult {
  order_id: number;
  transaction_ref: string;
  method: string;
  amount: number;
}

export function CheckoutView() {
  const navigate = useNavigate();
  const { items, cartTotal, clearCart } = useCart();
  const [method, setMethod] = useState<PaymentMethod>('COD');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  
  const [discountCode, setDiscountCode] = useState('');
  const [discountData, setDiscountData] = useState<any>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  if (items.length === 0 && !result) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <ShoppingCart size={48} className="text-[#D1D5DB]" />
        <p className="text-[#6B7280] text-lg">Giỏ hàng trống</p>
        <button
          onClick={() => navigate('/discovery')}
          className="text-[#2563EB] font-bold hover:underline"
        >
          ← Quay lại khám phá sách
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-12 border border-[#E5E7EB] bg-white">
          <div className="bg-green-100 w-20 h-20 flex items-center justify-center mx-auto mb-6 rounded-full">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-[#111827] text-2xl font-extrabold mb-2">Đặt hàng thành công!</h2>
          <p className="text-[#6B7280] mb-6">Cảm ơn bạn đã mua sách tại LUMINA</p>

          <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Mã đơn hàng</span>
              <span className="font-bold text-[#111827]">#{result.order_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Mã giao dịch</span>
              <span className="font-bold text-[#2563EB]">{result.transaction_ref}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Phương thức</span>
              <span className="font-bold text-[#111827]">{result.method}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-[#E5E7EB] pt-2 mt-2">
              <span className="text-[#6B7280]">Tổng thanh toán</span>
              <span className="font-bold text-[#2563EB] text-lg">{result.amount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex-1 border border-[#111827] py-3 font-bold text-[13px] text-[#111827] hover:bg-[#111827] hover:text-white transition-colors"
            >
              Xem đơn hàng
            </button>
            <button
              onClick={() => navigate('/discovery')}
              className="flex-1 bg-[#2563EB] py-3 font-bold text-[13px] text-white hover:bg-[#1D4ED8] transition-colors"
            >
              Tiếp tục mua sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError('Vui lòng điền đầy đủ thông tin giao hàng');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // 1. Tao don hang
      const orderRes = await createOrder(
        items.map(i => ({ book_id: i.book_id, quantity: i.quantity })),
        discountData?.code
      );

      // 2. Thanh toan
      const payRes = await client.post(`/orders/${orderRes.order_id}/pay`, {
        method,
        shipping_name: name,
        shipping_phone: phone,
        shipping_address: address,
      });

      setResult(payRes.data);
      clearCart();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi khi đặt hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setApplyingDiscount(true);
    setError('');
    try {
      const data = await validateDiscount(discountCode, cartTotal);
      setDiscountData(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Mã giảm giá không hợp lệ');
      setDiscountData(null);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const finalTotal = discountData ? discountData.final_total : cartTotal;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl p-12">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] mb-8 transition-colors"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        <h1 className="text-[#111827] mb-2" style={{ fontWeight: 800, fontSize: 32 }}>
          Thanh toán
        </h1>
        <p className="text-[#6B7280] mb-10" style={{ fontSize: 15 }}>
          Hoàn tất đơn hàng của bạn
        </p>

        <div className="grid grid-cols-12 gap-10">
          {/* Left: Form */}
          <div className="col-span-7 space-y-8">
            {/* Shipping Info */}
            <div className="border border-[#E5E7EB]">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                <h3 className="font-extrabold text-[14px] text-[#111827]">THÔNG TIN GIAO HÀNG</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-[#E5E7EB] px-4 py-3 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">
                    Số điện thoại *
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-[#E5E7EB] px-4 py-3 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="0901 234 567"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider block mb-1.5">
                    Địa chỉ giao hàng *
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full border border-[#E5E7EB] px-4 py-3 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                    placeholder="123 Đường ABC, Quận X, TP.HCM"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="border border-[#E5E7EB]">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                <h3 className="font-extrabold text-[14px] text-[#111827]">PHƯƠNG THỨC THANH TOÁN</h3>
              </div>
              <div className="p-6 space-y-3">
                {PAYMENT_METHODS.map(pm => {
                  const Icon = pm.icon;
                  const selected = method === pm.id;
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className={`w-full flex items-center gap-4 p-4 border text-left transition-all ${
                        selected
                          ? 'border-[#2563EB] bg-[#EFF6FF]'
                          : 'border-[#E5E7EB] hover:border-[#2563EB]'
                      }`}
                    >
                      <div className={`p-2.5 ${selected ? 'bg-[#2563EB] text-white' : 'bg-[#F9FAFB] text-[#6B7280]'}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-[#111827] text-[13px]">{pm.label}</p>
                        <p className="text-[#6B7280] text-[11px]">{pm.desc}</p>
                      </div>
                      {selected && (
                        <div className="ml-auto w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="col-span-5">
            <div className="border border-[#E5E7EB] sticky top-8">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
                <h3 className="font-extrabold text-[14px] text-[#111827]">TÓM TẮT ĐƠN HÀNG</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                  {items.map(item => (
                    <div key={item.book_id} className="flex justify-between text-[13px]">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-[#111827] font-bold truncate">{item.title}</p>
                        <p className="text-[#9CA3AF] text-[11px]">x{item.quantity}</p>
                      </div>
                      <span className="text-[#111827] font-bold whitespace-nowrap">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E5E7EB] pt-4 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Tạm tính</span>
                    <span className="text-[#111827]">{cartTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  
                  {/* Discount Section */}
                  <div className="py-3">
                    <div className="flex gap-2">
                      <input
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="Mã giảm giá (LUMINA20)"
                        className="flex-1 border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none"
                      />
                      <button
                        onClick={handleApplyDiscount}
                        disabled={applyingDiscount || !discountCode}
                        className="bg-[#111827] text-white px-4 py-2 text-[12px] font-bold hover:bg-black disabled:opacity-50"
                      >
                        {applyingDiscount ? '...' : 'Áp dụng'}
                      </button>
                    </div>
                    {discountData && (
                      <div className="flex items-center gap-2 mt-2 text-green-600 font-bold text-[12px]">
                        <Tag size={12} />
                        <span>Đã áp dụng mã {discountData.code}: -{discountData.discount_amount.toLocaleString('vi-VN')}đ</span>
                        <button onClick={() => { setDiscountData(null); setDiscountCode(''); }} className="ml-auto text-red-500 hover:underline">Xóa</button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Phí vận chuyển</span>
                    <span className="text-green-600 font-bold">Miễn phí</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E5E7EB] pt-3 mt-3">
                    <span className="font-bold text-[#111827]">TỔNG CỘNG</span>
                    <span className="font-extrabold text-[#2563EB] text-[20px]">
                      {finalTotal.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-[13px] mt-4 font-bold">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[#111827] text-white py-4 mt-6 font-bold text-[15px] hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận đặt hàng'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
