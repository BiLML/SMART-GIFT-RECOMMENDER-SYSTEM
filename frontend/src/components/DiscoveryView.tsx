import { Search, Loader2, RefreshCw, ShoppingCart, Heart, History, Filter } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import {
  searchBooks,
  getBooks,
  getSearchHistory,
  saveSearchHistory,
  type Book,
} from '@/api/books';
import { toggleFavorite } from '@/api/interactions';
import { BookCover } from './BookCover';

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1543004218-ee141104638e?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop',
];

export function DiscoveryView() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  
  // History state
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter/Sort state
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc'>('relevance');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [initialBooks, setInitialBooks] = useState<Book[]>([]);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingBooks(true);
      try {
        const books = await getBooks(0, 50);
        setInitialBooks(books || []);
      } catch (err) {
        console.error('Error fetching initial books:', err);
        setInitialBooks([]);
      } finally {
        setLoadingBooks(false);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        try {
          const apiHistory = await getSearchHistory(5);
          setHistory(apiHistory.map(h => h.query));
        } catch (err) {
          console.error('Error fetching history:', err);
        }
      } else {
        const local = localStorage.getItem('search_history');
        if (local) setHistory(JSON.parse(local));
      }
    };
    fetchHistory();

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  const addHistory = async (q: string) => {
    if (!q.trim()) return;
    const newHistory = [q, ...history.filter(item => item !== q)].slice(0, 5);
    setHistory(newHistory);
    
    if (user) {
      try { await saveSearchHistory(q); } catch (e) {}
    } else {
      localStorage.setItem('search_history', JSON.stringify(newHistory));
    }
  };

  const handleSearch = async (e?: React.FormEvent, searchQ?: string) => {
    if (e) e.preventDefault();
    const activeQuery = searchQ !== undefined ? searchQ : query;
    if (!activeQuery.trim()) return;

    setQuery(activeQuery);
    setShowHistory(false);
    setSearching(true);
    setLoadingBooks(true);
    
    await addHistory(activeQuery);

    try {
      const results = await searchBooks(activeQuery, 100);
      const mappedBooks = (results.ket_qua || []) as any as Book[];
      setSearchResults(mappedBooks);
      // Reset filters on new search
      setSortBy('relevance');
      setMaxPrice(null);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
      setLoadingBooks(false);
    }
  };

  const handleBookClick = (book: Book) => {
    navigate(`/book/${book.id}`, { state: { book } });
  };

  // Compute derived books based on filters
  const displayedBooks = useMemo(() => {
    let baseBooks = searchResults !== null ? searchResults : initialBooks;
    
    if (maxPrice !== null) {
      baseBooks = baseBooks.filter(b => b.price !== undefined && b.price <= maxPrice);
    }
    
    if (sortBy === 'price_asc') {
      baseBooks = [...baseBooks].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      baseBooks = [...baseBooks].sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    
    return baseBooks;
  }, [searchResults, initialBooks, sortBy, maxPrice]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[#F9FAFB] border-b border-[#E5E7EB] py-16">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <h1 className="text-[#111827] mb-4" style={{ fontWeight: 800, fontSize: '40px', letterSpacing: '-0.02em' }}>
            Khám Phá Sách Ngữ Nghĩa
          </h1>
          <p className="text-[#4B5563] mb-8" style={{ fontSize: '16px' }}>
            Tìm kiếm bằng AI thông qua ngữ nghĩa, không chỉ từ khóa
          </p>

          <div ref={searchContainerRef} className="relative max-w-2xl mx-auto z-50">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowHistory(true)}
                placeholder="Hỏi bất cứ điều gì: 'Sách về vượt qua thất bại'..."
                className="w-full border-2 border-[#111827] bg-white px-6 py-4 pr-16 shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0px_0px_rgba(17,24,39,1)] transition-all"
                style={{ fontSize: '15px', fontWeight: 500 }}
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#2563EB] text-white p-2.5 hover:bg-[#1D4ED8] transition-colors"
              >
                {searching ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
              </button>
            </form>

            {/* History Dropdown */}
            {showHistory && history.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-[#111827] shadow-[4px_4px_0px_0px_rgba(17,24,39,1)] overflow-hidden text-left">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <History size={14} /> Tìm kiếm gần đây
                </div>
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(undefined, item)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {searching && (
            <p className="text-center text-[#4B5563] mt-4" style={{ fontSize: '13px' }}>
              Đang tìm kiếm bằng AI ngữ nghĩa...
            </p>
          )}

          {/* Filters & Sorting */}
          {searchResults !== null && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] px-3 py-2 text-sm text-[#4B5563]">
                <Filter size={16} />
                <span className="font-semibold">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="relevance">Độ phù hợp</option>
                  <option value="price_asc">Giá: Thấp đến Cao</option>
                  <option value="price_desc">Giá: Cao đến Thấp</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] px-3 py-2 text-sm text-[#4B5563]">
                <span className="font-semibold">Lọc giá:</span>
                <select
                  value={maxPrice === null ? 'all' : maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value === 'all' ? null : Number(e.target.value))}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả giá</option>
                  <option value="100000">Dưới 100.000đ</option>
                  <option value="300000">Dưới 300.000đ</option>
                  <option value="500000">Dưới 500.000đ</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Book Grid */}
      <section className="mx-auto max-w-7xl px-8 py-12">
        <div className="mb-8">
          <h3 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '20px' }}>
            {searchResults !== null
              ? `Tìm thấy ${displayedBooks.length} kết quả`
              : 'Sách Đề Xuất'}
          </h3>
        </div>

        {loadingBooks ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayedBooks && displayedBooks.length > 0 ? (
              displayedBooks.map((book, index) => {
                const scoreDisplay = book.average_rating
                  ? (book.average_rating * 20).toFixed(0)
                  : Math.round((1 - index * 0.04) * 100).toString();

                return (
                  <div
                    key={book.id || index}
                    className="group relative border border-[#E5E7EB] bg-white hover:border-[#2563EB] hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    {/* Quick Actions */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({
                            book_id: book.id,
                            title: book.title,
                            author: book.author || 'Tác giả ẩn danh',
                            price: book.price || 0,
                            cover_url: book.cover_url || FALLBACK_COVERS[index % FALLBACK_COVERS.length],
                          });
                        }}
                        className="bg-white p-2 shadow-md border border-[#E5E7EB] text-[#111827] hover:bg-[#2563EB] hover:text-white transition-all rounded-full"
                      >
                        <ShoppingCart size={15} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user) return navigate('/');
                          try {
                            await toggleFavorite(book.id);
                            setFavorites(prev => ({ ...prev, [book.id]: !prev[book.id] }));
                          } catch {}
                        }}
                        className={`p-2 shadow-md border border-[#E5E7EB] transition-all rounded-full ${
                          favorites[book.id] ? 'bg-red-500 text-white' : 'bg-white text-[#111827] hover:bg-red-50'
                        }`}
                      >
                        <Heart size={15} fill={favorites[book.id] ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="cursor-pointer flex-1 flex flex-col" onClick={() => handleBookClick(book)}>
                      {/* Score Badge */}
                      <div className="absolute top-3 right-3 z-10 bg-[#111827] text-white px-2 py-1">
                        <span style={{ fontWeight: 800, fontSize: '12px' }}>{scoreDisplay}</span>
                      </div>

                      {/* Cover */}
                      <div className="bg-[#F3F4F6] w-full border-b border-[#E5E7EB] overflow-hidden" style={{ height: '280px' }}>
                        <BookCover
                          title={book.title}
                          defaultCover={book.cover_url || FALLBACK_COVERS[index % FALLBACK_COVERS.length]}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex-1">
                          <h4 className="text-[#111827] font-bold text-[14px] line-clamp-2 h-[40px] leading-snug mb-1">
                            {book.title}
                          </h4>
                          <p className="text-[#6B7280] text-[12px] truncate mb-2">
                            {book.author === 'Unknown' || !book.author ? 'Tác giả ẩn danh' : book.author}
                          </p>
                          <p className="text-[#2563EB] font-bold text-[14px] mb-3">
                            {book.price && book.price > 0 ? `${book.price.toLocaleString('vi-VN')}đ` : 'Liên hệ báo giá'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-4 text-center py-12">
                <p className="text-[#6B7280]">Không tìm thấy sách nào phù hợp với bộ lọc hiện tại.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
