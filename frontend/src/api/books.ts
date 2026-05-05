import client from './client';

export interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  category?: string;
  cover_url?: string;
  average_rating: number;
  price?: number;
  stock?: number;
}

export interface InventoryStats {
  total_books: number;
  total_stock: number;
  total_value: number;
  low_stock_count: number;
  low_stock_items: { id: number; title: string; stock: number }[];
  category_distribution: { category: string; book_count: number; stock_count: number }[];
}

export interface SearchResult {
  thong_diep: string;
  cau_hoi: string;
  ket_qua: Record<string, unknown>[];
}

export interface Recommendation {
  id: number;
  title: string;
  price?: number;
  cb_score: number;
  cf_score: number;
  final_score: number;
}

export interface UserStats {
  books_viewed: number;
  total_actions: number;
  reading_preferences: { category: string; value: number }[];
  member_since: string | null;
}

export interface AdminStats {
  active_users: number;
  total_books: number;
  total_actions: number;
  system_health: string;
  monthly_stats: { month: string; users: number; actions: number }[];
  recent_logs: {
    timestamp: string;
    event: string;
    user: string;
    book: string;
    status: string;
  }[];
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  created_at: string;
}

export async function searchBooks(query: string, limit: number = 100): Promise<SearchResult> {
  const res = await client.get('/search', { params: { q: query, limit } });
  return res.data;
}

export async function getRecommendations(
  userId: string,
  bookId: number,
  alpha: number = 0.5
): Promise<Recommendation[]> {
  const res = await client.get(`/recommend/${userId}/${bookId}`, { params: { alpha } });
  return res.data.data;
}

export async function getBooks(skip: number = 0, limit: number = 50): Promise<Book[]> {
  const res = await client.get('/books', { params: { skip, limit } });
  return res.data;
}

export async function getBook(id: number): Promise<Book> {
  const res = await client.get(`/books/${id}`);
  return res.data;
}

export async function createBook(data: Partial<Book>): Promise<Book> {
  const res = await client.post('/books', data);
  return res.data;
}

export async function updateBook(id: number, data: Partial<Book>): Promise<Book> {
  const res = await client.put(`/books/${id}`, data);
  return res.data;
}

export async function deleteBook(id: number): Promise<void> {
  await client.delete(`/books/${id}`);
}

export async function trackAction(
  sessionId: string,
  bookId: number,
  actionType: string = 'view_detail',
  userId?: number
) {
  const res = await client.post('/actions/track', {
    session_id: sessionId,
    book_id: bookId,
    action_type: actionType,
    user_id: userId ?? null,
  });
  return res.data;
}

export async function getUserStats(): Promise<UserStats> {
  const res = await client.get('/profile/stats');
  return res.data;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await client.get('/admin/stats');
  return res.data;
}

export async function getSearchHistory(limit: number = 10): Promise<SearchHistoryItem[]> {
  const res = await client.get('/search-history', { params: { limit } });
  return res.data;
}

export async function saveSearchHistory(query: string): Promise<void> {
  await client.post('/search-history', { query });
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const res = await client.get('/inventory/stats');
  return res.data;
}
