import React, { useState, useEffect } from 'react';

interface BookCoverProps {
  title: string;
  defaultCover: string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

// Giới hạn cache để không làm đầy localStorage
const CACHE_KEY_PREFIX = 'cover_v2_';

export function BookCover({ title, defaultCover, className = '', alt = '', style }: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string>(defaultCover);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Nếu tiêu đề bị rỗng, dùng ảnh mặc định
    if (!title) {
      setLoading(false);
      return;
    }

    // Làm sạch tiêu đề để tìm kiếm chính xác hơn
    let cleanTitle = title
      .split('-')[0]
      .split('(')[0]
      .replace(/tập \d+/gi, '')
      .replace(/tái bản \d+/gi, '')
      .replace(/combo/gi, '')
      .replace(/bộ \d+ cuốn/gi, '')
      .replace(/tặng kèm.*/gi, '')
      .trim();
    const cacheKey = `${CACHE_KEY_PREFIX}${cleanTitle}`;

    // Kiểm tra cache trong localStorage
    const cachedCover = localStorage.getItem(cacheKey);
    if (cachedCover) {
      if (cachedCover !== 'not_found') {
        setCoverUrl(cachedCover);
      }
      setLoading(false);
      return;
    }

    // Nếu không có trong cache, gọi Google Books API
    const fetchCover = async () => {
      try {
        // Thử tìm kiếm theo tiêu đề chính xác trước
        let searchUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanTitle)}&maxResults=1`;
        let response = await fetch(searchUrl);
        let data = await response.json();

        // Nếu không thấy, thử tìm kiếm rộng hơn (bỏ qua intitle nếu có dùng)
        if (!data.items || data.items.length === 0) {
           // Đã thử mặc định là không dùng intitle ở trên vì nó hiệu quả hơn với sách tiếng Việt
        }

        if (data.items && data.items.length > 0) {
          const volumeInfo = data.items[0].volumeInfo;
          const imageUrl =
            volumeInfo.imageLinks?.thumbnail ||
            volumeInfo.imageLinks?.smallThumbnail;

          if (imageUrl) {
            const secureUrl = imageUrl.replace('http:', 'https:');
            setCoverUrl(secureUrl);
            localStorage.setItem(cacheKey, secureUrl);
          } else {
            localStorage.setItem(cacheKey, 'not_found');
          }
        } else {
          localStorage.setItem(cacheKey, 'not_found');
        }
      } catch (error) {
        console.error('Failed to fetch cover for', cleanTitle, error);
      } finally {
        setLoading(false);
      }
    };

    // Thêm delay nhỏ để tránh vượt quá rate limit của API khi load danh sách dài
    const timeoutId = setTimeout(() => {
      fetchCover();
    }, 100 + Math.random() * 500);

    return () => clearTimeout(timeoutId);
  }, [title]);

  return (
    <img
      src={coverUrl}
      alt={alt || title}
      className={`${className} ${loading ? 'animate-pulse bg-gray-200' : ''}`}
      style={style}
      onError={(e) => {
        // Nếu ảnh lỗi, quay về ảnh mặc định
        (e.target as HTMLImageElement).src = defaultCover;
      }}
    />
  );
}
