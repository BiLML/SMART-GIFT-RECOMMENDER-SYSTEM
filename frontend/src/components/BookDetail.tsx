import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { getBook, getRecommendations, trackAction } from '@/api/books';
import { checkFavoriteStatus, toggleFavorite, getReviews, submitReview, updateReview, deleteReview, type Review } from '@/api/interactions';
import { BookCover } from './BookCover';

const COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=600&fit=crop',
];

function getSession(): string {
  let s = sessionStorage.getItem('lumina_session') || '';
  if (!s) {
    s = Math.random().toString(36).slice(2);
    sessionStorage.setItem('lumina_session', s);
  }
  return s;
}

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recs, setRecs] = useState<any[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    setBook(null);
    setRecs([]);

    getBook(Number(id))
      .then((data) => {
        setBook(data);
        // Track view
        trackAction(getSession(), Number(id), 'view_detail', user?.id).catch(() => {});
        // Load favorites and recommendations if logged in
        if (user) {
          checkFavoriteStatus(Number(id)).then(setSaved).catch(() => {});
          
          setRecsLoading(true);
          getRecommendations(String(user.id), Number(id))
            .then((r) => setRecs(r || []))
            .catch(() => setRecs([]))
            .finally(() => setRecsLoading(false));
        }
      })
      .catch(() => setError('Không tìm thấy sách hoặc lỗi máy chủ.'))
      .finally(() => setLoading(false));
      
    // Load reviews
    getReviews(Number(id)).then(setReviews).catch(() => {});
  }, [id, user]);

  const handleSave = async () => {
    if (!user) return alert('Vui lòng đăng nhập để lưu sách');
    try {
      const res = await toggleFavorite(Number(id));
      setSaved(res.is_favorite);
    } catch (e) {
      alert('Lỗi khi lưu sách');
    }
  };

  // handlePurchase removed - replaced with addToCart in the UI

  const handleReviewSubmit = async () => {
    if (!user) return alert('Vui lòng đăng nhập để viết đánh giá');
    if (!rating) return;
    setSubmittingReview(true);
    try {
      await submitReview(Number(id), rating, reviewText);
      const newReviews = await getReviews(Number(id));
      setReviews(newReviews);
      setReviewText('');
    } catch (e) {
      alert('Lỗi khi gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewUpdate = async (reviewId: number) => {
    try {
      await updateReview(reviewId, editRating, editComment);
      setEditingReviewId(null);
      const newReviews = await getReviews(Number(id));
      setReviews(newReviews);
    } catch (e) {
      alert('Lỗi khi cập nhật đánh giá');
    }
  };

  const handleReviewDelete = async (reviewId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      await deleteReview(reviewId);
      const newReviews = await getReviews(Number(id));
      setReviews(newReviews);
    } catch (e) {
      alert('Lỗi khi xóa đánh giá');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 18, color: '#4B5563' }}>Đang tải thông tin sách...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Không tìm thấy sách</p>
        <p style={{ color: '#4B5563' }}>{error}</p>
        <button
          onClick={() => navigate('/discovery')}
          style={{ color: '#2563EB', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
        >
          ← Quay lại trang Khám Phá
        </button>
      </div>
    );
  }

  const cover = book.cover_url || COVERS[Number(id) % COVERS.length];
  const paragraphs: string[] = book.description
    ? book.description.split('\n').filter((p: string) => p.trim())
    : ['Chưa có nội dung mô tả.'];
  const tags: string[] = book.category ? [book.category] : ['General'];
  const stars = Math.min(5, Math.round(book.average_rating || 0));

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #E5E7EB', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button
          id="back-to-discovery"
          onClick={() => navigate('/discovery')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4B5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
        >
          ← Quay lại trang Khám Phá
        </button>
        <button
          id="save-book-btn"
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            border: saved ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
            background: saved ? '#FEF2F2' : '#fff',
            color: saved ? '#DC2626' : '#4B5563',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {saved ? '♥ Đã lưu' : '♡ Lưu yêu thích'}
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', minHeight: 'calc(100vh - 64px)' }}>
        {/* Left: cover + metadata */}
        <div style={{ borderRight: '1px solid #E5E7EB', background: '#F9FAFB', padding: 32 }}>
          <div style={{ position: 'sticky', top: 80 }}>
            {/* Cover image */}
            <div style={{ border: '2px solid #111827', marginBottom: 24, overflow: 'hidden', aspectRatio: '3/4' }}>
              <BookCover
                title={book.title}
                defaultCover={cover}
                alt={book.title}
                className=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Title & author */}
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 6px', lineHeight: 1.3 }}>
              {book.title}
            </h1>
            <p style={{ fontSize: 15, color: '#4B5563', margin: '0 0 12px' }}>
              {book.author === 'Unknown' ? 'Tác giả ẩn danh' : book.author}
            </p>

            {/* Stars */}
            {book.average_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} style={{ color: n <= stars ? '#F59E0B' : '#E5E7EB', fontSize: 18 }}>★</span>
                ))}
                <span style={{ fontSize: 13, color: '#4B5563', marginLeft: 4 }}>({book.average_rating.toFixed(1)})</span>
              </div>
            )}

            {/* Price */}
            {book.price > 0 && (
              <p style={{ fontSize: 20, fontWeight: 700, color: '#2563EB', margin: '0 0 16px' }}>
                {book.price.toLocaleString('vi-VN')}đ
              </p>
            )}

            {/* Tags */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Chủ đề</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tags.map((t) => (
                  <span key={t} style={{ border: '1px solid #111827', padding: '4px 10px', fontSize: 12, color: '#111827', background: '#fff' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                id="read-preview-btn"
                onClick={() => navigate('/reading', { state: { book: { id: book.id, title: book.title, author: book.author, description: book.description, category: book.category, cover } } })}
                style={{ padding: '14px 0', background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                📖 Đọc Thử
              </button>
              {book.price > 0 && (
                <button
                  id="add-to-cart-btn"
                  onClick={() => {
                    addToCart({
                      book_id: book.id,
                      title: book.title,
                      author: book.author,
                      price: book.price,
                      cover_url: cover,
                    });
                    alert('Đã thêm vào giỏ hàng!');
                  }}
                  style={{ padding: '12px 0', background: '#fff', color: '#111827', border: '2px solid #111827', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
                >
                  🛒 Thêm vào giỏ hàng
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: description + recommendations */}
        <div style={{ padding: '40px 48px', background: '#fff' }}>
          {/* About section */}
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>Giới Thiệu Sách</h2>
          <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 40, marginBottom: 40 }}>
            {paragraphs.map((p, i) => (
              <p key={i} style={{ fontSize: 16, lineHeight: 1.85, color: '#374151', margin: '0 0 20px' }}>
                {p}
              </p>
            ))}
          </div>

          {/* Recommendations */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Bạn Có Thể Thích</h3>
              <span style={{ border: '1px solid #2563EB', background: '#EFF6FF', padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#2563EB' }}>
                ● HYBRID AI
              </span>
            </div>

            {recsLoading && (
              <p style={{ color: '#4B5563', fontSize: 14 }}>Đang tính toán các đề xuất bằng AI...</p>
            )}

            {!recsLoading && recs.length === 0 && (
              <div style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', padding: 24 }}>
                <p style={{ color: '#4B5563', fontSize: 14, margin: 0 }}>
                  {user
                    ? 'Khám phá thêm sách để nhận được các đề xuất AI tốt hơn.'
                    : 'Đăng nhập để nhận các đề xuất được cá nhân hóa.'}
                </p>
              </div>
            )}

            {!recsLoading && recs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {recs.map((rec: any) => (
                  <button
                    key={rec.id}
                    id={`rec-${rec.id}`}
                    onClick={() => navigate(`/book/${rec.id}`)}
                    style={{ border: '1px solid #E5E7EB', background: '#F9FAFB', padding: 16, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.4 }}>
                      {rec.title}
                    </p>
                    <div style={{ height: 4, background: '#E5E7EB', marginBottom: 6 }}>
                      <div style={{ height: '100%', background: '#2563EB', width: `${Math.round((rec.final_score || 0) * 100)}%` }} />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', margin: 0 }}>
                      {Math.round((rec.final_score || 0) * 100)}% độ phù hợp
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Reviews Section */}
          <div style={{ marginTop: 60 }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 24 }}>Đánh giá & Xếp hạng</h3>
            
            {user && (
              <div style={{ marginBottom: 32, padding: 24, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 15 }}>Viết đánh giá</h4>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRating(r)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 24, color: r <= rating ? '#F59E0B' : '#E5E7EB' }}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Bạn nghĩ gì về cuốn sách này?"
                  style={{ width: '100%', height: 100, padding: 12, border: '1px solid #D1D5DB', marginBottom: 16, fontFamily: 'inherit', resize: 'vertical' }}
                />
                <button
                  onClick={handleReviewSubmit}
                  disabled={submittingReview}
                  style={{ padding: '10px 24px', background: '#111827', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {submittingReview ? 'Đang gửi...' : 'Đăng Đánh Giá'}
                </button>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {reviews.length === 0 ? (
                <p style={{ color: '#4B5563' }}>Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>
              ) : (
                reviews.map(r => (
                  <div key={r.id} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{r.username}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {user && (user.id === r.user_id || user.role === 'admin') && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              onClick={() => {
                                setEditingReviewId(r.id);
                                setEditRating(r.rating);
                                setEditComment(r.comment || '');
                              }}
                              style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                            >
                              Sửa
                            </button>
                            <button 
                              onClick={() => handleReviewDelete(r.id)}
                              style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                        <span style={{ color: '#6B7280', fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {editingReviewId === r.id ? (
                      <div style={{ background: '#F3F4F6', padding: 16, marginTop: 12 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditRating(star)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: star <= editRating ? '#F59E0B' : '#D1D5DB' }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          style={{ width: '100%', padding: 8, border: '1px solid #D1D5DB', marginBottom: 12, fontSize: 14 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            onClick={() => handleReviewUpdate(r.id)}
                            style={{ padding: '6px 12px', background: '#111827', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Cập nhật
                          </button>
                          <button 
                            onClick={() => setEditingReviewId(null)}
                            style={{ padding: '6px 12px', background: '#fff', color: '#4B5563', border: '1px solid #D1D5DB', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ color: '#F59E0B', marginBottom: 8, fontSize: 14 }}>
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </div>
                        {r.comment && <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>{r.comment}</p>}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
