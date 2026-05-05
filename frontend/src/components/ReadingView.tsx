import { Highlighter, BookmarkPlus, ArrowLeft, Loader2, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchBooks } from '@/api/books';

interface BookState {
  id: number;
  title: string;
  author: string;
  description?: string;
  category?: string;
  cover?: string;
}

export function ReadingView() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookState = location.state?.book as BookState | undefined;

  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<{ term: string; definition: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [highlights, setHighlights] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const aiInputRef = useRef<HTMLInputElement>(null);

  // Use real book content or a default
  const title = bookState?.title || 'The Architecture of Knowledge';
  const author = bookState?.author || 'LUMINA AI';
  const category = bookState?.category || '';
  const rawText =
    bookState?.description ||
    `The essence of knowledge lies not in the accumulation of facts, but in the connections we forge between ideas. Every book is a universe unto itself, containing threads that weave through the fabric of human understanding.

In this digital age, the ability to navigate semantic landscapes becomes paramount. We no longer simply readâ€”we explore, we connect, we synthesize. The traditional linear approach to reading transforms into a multidimensional journey through concepts and themes.

Consider how ideas evolve across texts, how a single concept might appear in philosophy, science, and art, each time revealing a different facet of truth. This is where semantic search becomes transformative, allowing us to trace these conceptual threads across the boundaries of individual works.

The architecture of information shapes how we think. From the ancient Library of Alexandria to modern knowledge graphs, the structure we impose on information fundamentally alters our relationship with it.`;

  const paragraphs = rawText.split(/\n+/).filter(Boolean);

  const handleHighlight = (idx: number) => {
    setHighlights((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleBookmark = (idx: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSearchHighlight = () => {
    if (!searchQuery.trim()) { setHighlights(new Set()); return; }
    const q = searchQuery.toLowerCase();
    const matched = new Set<number>();
    paragraphs.forEach((p, i) => {
      if (p.toLowerCase().includes(q)) matched.add(i);
    });
    setHighlights(matched);
  };

  const handleAiAsk = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    try {
      // Use our semantic search against the ChromaDB collection
      const res = await searchBooks(aiQuery, 3);
      const results = res.ket_qua.slice(0, 3).map((item: any) => ({
        term: item.title || item.ten_sach || aiQuery,
        definition: item.description || item.mo_ta || 'A related book found via semantic AI search.',
      }));
      setAiResults(results.length > 0 ? results : [
        { term: aiQuery, definition: 'No exact semantic match found. Try rephrasing your question.' },
      ]);
    } catch {
      setAiResults([
        { term: aiQuery, definition: 'AI search is temporarily unavailable. Please try again shortly.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAiAsk();
  };

  const wordCount = rawText.split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 200);

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-white">
      {/* Left Pane: Reading Interface (62%) */}
      <main className="flex-1 border-r border-[#E5E7EB] p-10 overflow-y-auto" style={{ width: '62%' }}>
        <div className="mx-auto max-w-2xl">
          {/* Back button */}
          {bookState && (
            <button
              onClick={() => navigate(`/book/${bookState.id}`)}
              className="flex items-center gap-2 text-[#4B5563] hover:text-[#2563EB] transition-colors mb-8"
              style={{ fontSize: '14px' }}
            >
              <ArrowLeft size={16} />
              Quay lại thông tin sách
            </button>
          )}

          {/* Book Header */}
          <div className="mb-8 border-b border-[#E5E7EB] pb-6">
            {category && (
              <p className="text-[#4B5563] mb-2" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {category}
              </p>
            )}
            <h1 className="text-[#111827]" style={{ fontWeight: 800, fontSize: '32px', lineHeight: '1.2' }}>
              {title}
            </h1>
            <p className="text-[#4B5563] mt-2" style={{ fontSize: '16px' }}>
              {author}
            </p>
            <p className="text-[#9CA3AF] mt-1" style={{ fontSize: '13px' }}>
              ~{readTime} phút đọc · {wordCount.toLocaleString()} từ
            </p>
          </div>

          {/* Inline search */}
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchHighlight()}
              placeholder="Làm nổi bật đoạn văn chứa..."
              className="flex-1 border border-[#E5E7EB] bg-white px-4 py-2.5 text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              style={{ fontSize: '14px' }}
            />
            <button
              onClick={handleSearchHighlight}
              className="border border-[#E5E7EB] px-4 py-2.5 text-[#4B5563] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors flex items-center gap-2"
            >
              <Search size={16} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Nổi bật</span>
            </button>
            {highlights.size > 0 && (
              <button
                onClick={() => setHighlights(new Set())}
                className="text-[#4B5563] hover:text-[#111827] px-3 text-sm"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Reading Controls */}
          <div className="mb-6 flex gap-3">
            <span className="text-[#9CA3AF]" style={{ fontSize: '12px', alignSelf: 'center' }}>
              Nhấp vào đoạn văn bất kỳ để làm nổi bật hoặc lưu trữ
            </span>
          </div>

          {/* Reading Content */}
          <div className="space-y-6">
            {paragraphs.map((paragraph, idx) => {
              const isHighlighted = highlights.has(idx);
              const isBookmarked = bookmarks.has(idx);
              return (
                <div key={idx} className="group relative">
                  {/* Paragraph actions */}
                  <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleHighlight(idx)}
                      className={`p-1.5 transition-colors ${isHighlighted ? 'text-[#2563EB]' : 'text-[#D1D5DB] hover:text-[#2563EB]'}`}
                      title="Highlight"
                    >
                      <Highlighter size={14} />
                    </button>
                    <button
                      onClick={() => handleBookmark(idx)}
                      className={`p-1.5 transition-colors ${isBookmarked ? 'text-amber-500' : 'text-[#D1D5DB] hover:text-amber-500'}`}
                      title="Bookmark"
                    >
                      <BookmarkPlus size={14} />
                    </button>
                  </div>

                  <p
                    className={`text-[#111827] leading-relaxed transition-all cursor-pointer ${
                      isHighlighted ? 'bg-[#DBEAFE] border-l-4 border-[#2563EB] pl-4 py-2 -ml-4' : ''
                    } ${isBookmarked ? 'border-r-4 border-amber-400 pr-2' : ''}`}
                    style={{ fontSize: '17px', lineHeight: '1.85' }}
                    onClick={() => handleHighlight(idx)}
                  >
                    {paragraph}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          {(highlights.size > 0 || bookmarks.size > 0) && (
            <div className="mt-8 border border-[#E5E7EB] bg-[#F9FAFB] p-4 flex gap-6">
              {highlights.size > 0 && (
                <p className="text-[#4B5563]" style={{ fontSize: '13px' }}>
                  <span className="text-[#2563EB] font-bold">{highlights.size}</span> đoạn được làm nổi bật
                </p>
              )}
              {bookmarks.size > 0 && (
                <p className="text-[#4B5563]" style={{ fontSize: '13px' }}>
                  <span className="text-amber-500 font-bold">{bookmarks.size}</span> đoạn được lưu trữ
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right Pane: AI Panel (38%) */}
      <aside className="bg-[#F9FAFB] p-8 overflow-y-auto" style={{ width: '38%' }}>
        <div className="sticky top-0">
          <h3 className="text-[#111827] mb-6" style={{ fontWeight: 800, fontSize: '18px' }}>
            Trợ Lý Đọc Sách AI
          </h3>

          {/* AI Query */}
          <div className="mb-6">
            <label className="text-[#111827] mb-2 block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hỏi về các khái niệm trong cuốn sách này
            </label>
            <div className="flex gap-2">
              <input
                ref={aiInputRef}
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="'semantic landscape' nghĩa là gì?"
                className="flex-1 border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                style={{ fontSize: '13px' }}
              />
              <button
                onClick={handleAiAsk}
                disabled={aiLoading}
                className="bg-[#2563EB] px-4 text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
          </div>

          {/* AI Results */}
          {aiLoading && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 size={18} className="animate-spin text-[#2563EB]" />
              <span className="text-[#4B5563]" style={{ fontSize: '13px' }}>Đang tìm kiếm chỉ mục ngữ nghĩa...</span>
            </div>
          )}

          {aiResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-[#111827] mb-3" style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Kết Quả Tìm Kiếm Ngữ Nghĩa
              </p>
              {aiResults.map((result, idx) => (
                <div key={idx} className="border border-[#E5E7EB] bg-white p-4">
                  <h4 className="text-[#111827] mb-2" style={{ fontWeight: 700, fontSize: '13px' }}>
                    {result.term}
                  </h4>
                  <p className="text-[#4B5563]" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    {result.definition}
                  </p>
                </div>
              ))}
            </div>
          )}

          {aiResults.length === 0 && !aiLoading && (
            <div className="border border-dashed border-[#E5E7EB] p-6 text-center">
              <p className="text-[#9CA3AF]" style={{ fontSize: '13px' }}>
                Đặt một câu hỏi để tìm kiếm trên cơ sở dữ liệu tri thức ngữ nghĩa
              </p>
            </div>
          )}

          {/* Bookmarks sidebar */}
          {bookmarks.size > 0 && (
            <div className="mt-8 border-t border-[#E5E7EB] pt-6">
              <p className="text-[#111827] mb-3" style={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Đoạn Đã Lưu ({bookmarks.size})
              </p>
              <div className="space-y-2">
                {[...bookmarks].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      document.querySelector(`[data-para="${idx}"]`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full border border-[#E5E7EB] bg-white p-3 text-left hover:border-amber-400 transition-colors"
                  >
                    <p className="text-[#4B5563] mb-1" style={{ fontSize: '11px' }}>Đoạn {idx + 1}</p>
                    <p className="text-[#111827] line-clamp-2" style={{ fontSize: '12px' }}>
                      {paragraphs[idx]?.slice(0, 80)}â€¦
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
