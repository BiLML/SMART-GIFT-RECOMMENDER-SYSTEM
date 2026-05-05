import client from './client';

export interface OrderItem {
  id?: number;
  book_id: number;
  book_title?: string;
  quantity: number;
  price?: number;
}

export interface Order {
  id: number;
  total_amount: number;
  discount_code?: string;
  discount_amount?: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  user_email?: string;
}

export async function createOrder(items: { book_id: number; quantity: number }[], discountCode?: string) {
  const res = await client.post('/orders/', { items, discount_code: discountCode });
  return res.data;
}

export async function validateDiscount(code: string, orderValue: number) {
  const res = await client.get(`/discounts/validate/${code}`, { params: { order_value: orderValue } });
  return res.data;
}

export async function getMyOrders(): Promise<Order[]> {
  const res = await client.get('/orders/me');
  return res.data;
}

export async function getAllOrders(): Promise<Order[]> {
  const res = await client.get('/orders/admin');
  return res.data;
}

export async function updateOrderStatus(orderId: number, status: string) {
  const res = await client.put(`/orders/${orderId}/status`, null, { params: { status } });
  return res.data;
}

export async function payOrder(orderId: number, method: string, shippingInfo?: { name: string; phone: string; address: string }) {
  const res = await client.post(`/orders/${orderId}/pay`, {
    method,
    shipping_name: shippingInfo?.name || '',
    shipping_phone: shippingInfo?.phone || '',
    shipping_address: shippingInfo?.address || '',
  });
  return res.data;
}
export async function cancelOrder(orderId: number) {
  const res = await client.post(`/orders/${orderId}/cancel`);
  return res.data;
}
