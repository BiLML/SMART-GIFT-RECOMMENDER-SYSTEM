import cloudscraper
from bs4 import BeautifulSoup # thư viện để đọc 
import time
import json

scraper = cloudscraper.create_scraper(
    browser={
        'browser': 'chrome',
        'platform': 'windows',
        'desktop': True
    }
)

kho_du_lieu = [] 

# CHẠY 235 TRANG
for i in range(1, 235):
    print(f"\n--- Đang tải trang {i} ---")
    
    # URL API LẤY THEO DANH MỤC
    # category_id=4 là Sách Trong Nước, currentPage={i} là trang hiện tại
    url_api = f"https://www.fahasa.com/fahasa_catalog/product/loadproducts?category_id=4&currentPage={i}&limit=24&order=num_orders&series_type=0"

    # Dùng GET vì các tham số đã nằm trên URL
    response = scraper.get(url_api)

    if response.status_code != 200:
        print(f"Lỗi tải trang {i}! Mã:", response.status_code)
        continue
    
    try:
        data = response.json()
        danh_sach_sach = data.get('product_list', []) 
        
        print(f"Thành công! Tìm thấy {len(danh_sach_sach)} cuốn sách ở trang {i}.")

        for sach in danh_sach_sach:
            ma_sach = sach.get('product_id')
            ten_sach = sach.get('product_name')
            gia_ban = sach.get('product_price')
            
            # Xử lý URL sách
            duoi_url = sach.get('product_url')
            if duoi_url and not duoi_url.startswith('http'):
                url_sach = f"https://www.fahasa.com/{duoi_url}"
            else:
                url_sach = duoi_url

            try: 
                response_html = scraper.get(url_sach)
                soup = BeautifulSoup(response_html.text, 'html.parser')
                mo_ta = soup.find('div', id='desc_content')

                if mo_ta:
                    mo_ta_text = mo_ta.text.strip()
                    print(f"Đã lấy: {ten_sach[:30]}...") # In 30 ký tự tên
                else:
                    mo_ta_text = ""
                    print(f"Không có mô tả: {ten_sach[:30]}...")
                    
                cuon_sach = {
                    "id": ma_sach,
                    "title": ten_sach,
                    "price": gia_ban,
                    "description": mo_ta_text
                }
                kho_du_lieu.append(cuon_sach)

            except Exception as e:
                print(f'❌ Lỗi chi tiết sách {ten_sach[:20]}: {e}')

            time.sleep(1.5) # Nghỉ 1.5s
            
    except Exception as e:
        print(f"Lỗi đọc JSON trang {i}: {e}")

# Lưu dữ liệu
with open('du_lieu_sach_fahasa.json', 'w', encoding='utf-8') as file:
    json.dump(kho_du_lieu, file, ensure_ascii=False, indent=4) 

print(f"\nĐã cào được {len(kho_du_lieu)} cuốn sách.")