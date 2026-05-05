import client from './client';

export interface Review {
  id: number;
  user_id: number;
  username: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export async function submitReview(bookId: number, rating: number, comment?: string) {
  const res = await client.post(`/interactions/books/${bookId}/reviews`, { rating, comment });
  return res.data;
}

export async function getReviews(bookId: number): Promise<Review[]> {
  const res = await client.get(`/interactions/books/${bookId}/reviews`);
  return res.data;
}

export async function updateReview(reviewId: number, rating: number, comment?: string) {
  const res = await client.put(`/interactions/reviews/${reviewId}`, { rating, comment });
  return res.data;
}

export async function deleteReview(reviewId: number) {
  const res = await client.delete(`/interactions/reviews/${reviewId}`);
  return res.data;
}

export async function toggleFavorite(bookId: number) {
  const res = await client.post(`/interactions/books/${bookId}/favorite`);
  return res.data;
}

export async function checkFavoriteStatus(bookId: number): Promise<boolean> {
  const res = await client.get(`/interactions/books/${bookId}/favorite/status`);
  return res.data.is_favorite;
}

export async function getMyFavorites() {
  const res = await client.get('/interactions/favorites');
  return res.data;
}
