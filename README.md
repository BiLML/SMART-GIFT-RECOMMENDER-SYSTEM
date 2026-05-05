# 📚 LUMINA — Hệ Thống Gợi Ý Sách Thông Minh

**LUMINA** (Logical User Match and Information Network Architecture) là hệ thống gợi ý sách sử dụng AI, kết hợp tìm kiếm ngữ nghĩa (BERT) và lọc cộng tác (Collaborative Filtering) để mang đến trải nghiệm khám phá sách cá nhân hóa.

---

## 📋 Mục Lục

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Kiến trúc tổng quan](#-kiến-trúc-tổng-quan)
3. [Bước 1 — Cào dữ liệu sách từ Fahasa](#-bước-1--cào-dữ-liệu-sách-từ-fahasa)
4. [Bước 2 — Làm sạch dữ liệu (EDA)](#-bước-2--làm-sạch-dữ-liệu-eda)
5. [Bước 3 — Tạo Vector Embedding (ChromaDB)](#-bước-3--tạo-vector-embedding-chromadb)
6. [Bước 4 — Huấn luyện mô hình Collaborative Filtering](#-bước-4--huấn-luyện-mô-hình-collaborative-filtering)
7. [Bước 5 — Cấu hình biến môi trường](#-bước-5--cấu-hình-biến-môi-trường)
8. [Bước 6 — Khởi chạy hệ thống](#-bước-6--khởi-chạy-hệ-thống)
9. [Bước 7 — Seed dữ liệu vào PostgreSQL](#-bước-7--seed-dữ-liệu-vào-postgresql)
10. [Bước 8 — Kiểm tra hoạt động](#-bước-8--kiểm-tra-hoạt-động)
11. [Tài khoản demo](#-tài-khoản-demo)
12. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
13. [Xử lý sự cố](#-xử-lý-sự-cố)

---

## 💻 Yêu Cầu Hệ Thống

| Phần mềm          | Phiên bản tối thiểu | Ghi chú                                |
| ------------------ | -------------------- | -------------------------------------- |
| **Python**         | 3.10+                | Dùng cho backend, scraper, training AI |
| **Node.js**        | 18+                  | Dùng cho frontend (React/Vite)         |
| **Docker Desktop** | 4.x                  | Dùng để chạy PostgreSQL + toàn hệ thống |
| **Git**            | 2.x                  | Quản lý mã nguồn                      |

> **💡 Lưu ý:** Nếu chạy bằng Docker Compose thì không cần cài riêng Python/Node.js trên máy chủ. Tuy nhiên, các bước cào dữ liệu và huấn luyện AI cần chạy trực tiếp bằng Python trên máy local.

---

## 🏗 Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│                    LUMINA SYSTEM                        │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │ Frontend │◄──►│   Backend    │◄──►│  PostgreSQL   │ │
│  │ React/TS │    │   FastAPI    │    │   (Docker)    │ │
│  │ Vite     │    │   Python     │    └───────────────┘ │
│  │ Port:3000│    │   Port:8001  │                      │
│  └──────────┘    │              │    ┌───────────────┐ │
│                  │  ┌────────┐  │◄──►│   ChromaDB    │ │
│                  │  │ BERT   │  │    │ (Vector DB)   │ │
│                  │  │ Model  │  │    └───────────────┘ │
│                  │  └────────┘  │                      │
│                  │  ┌────────┐  │    ┌───────────────┐ │
│                  │  │ CF     │  │◄──►│  PyTorch      │ │
│                  │  │ Model  │  │    │  (CF Model)   │ │
│                  │  └────────┘  │    └───────────────┘ │
│                  └──────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🕷 Bước 1 — Cào Dữ Liệu Sách Từ Fahasa

Script `data/scrap.py` sẽ cào khoảng **5.600 cuốn sách** từ API của Fahasa (235 trang, mỗi trang 24 sản phẩm), bao gồm: ID, tên sách, giá bán, và mô tả chi tiết.

### 1.1. Cài đặt thư viện cào dữ liệu

```bash
pip install cloudscraper beautifulsoup4
```

### 1.2. Chạy script cào dữ liệu

```bash
cd data
python scrap.py
```

### 1.3. Kết quả

- **File đầu ra:** `data/du_lieu_sach_fahasa.json`
- **Thời gian ước tính:** ~3-5 tiếng (do nghỉ 1.5s giữa mỗi request để tránh bị chặn)
- **Định dạng dữ liệu:**

```json
[
    {
        "id": 1041827,
        "title": "Một Ngày Bình Thường Để Thương Mình",
        "price": "65.000",
        "description": "Cuốn sách về chữa lành tâm hồn..."
    }
]
```

> **⚠️ Lưu ý:** Fahasa có thể thay đổi cấu trúc API bất cứ lúc nào. Nếu script lỗi, kiểm tra lại URL API trong file `scrap.py`. Quá trình cào mất nhiều giờ — hãy đảm bảo kết nối mạng ổn định.

---

## 🧹 Bước 2 — Làm Sạch Dữ Liệu (EDA)

Notebook `data/EDA.ipynb` thực hiện việc phân tích, khám phá, và làm sạch dữ liệu thô.

### 2.1. Cài đặt thư viện

```bash
pip install pandas jupyter notebook
```

### 2.2. Chạy notebook

```bash
cd data
jupyter notebook EDA.ipynb
```

### 2.3. Thực hiện trong notebook

- Đọc file `du_lieu_sach_fahasa.json`
- Loại bỏ bản ghi trùng lặp
- Xử lý giá trị thiếu (null/NaN)
- Chuẩn hóa cột giá, mô tả
- Xuất kết quả ra file CSV

### 2.4. Kết quả

- **File đầu ra:** `data/du_lieu_sach_fahasa_clean.csv`
- File CSV này sẽ được dùng cho tất cả các bước tiếp theo.

---

## 🧠 Bước 3 — Tạo Vector Embedding (ChromaDB)

Script `backend/src/bert-server/init_db.py` sử dụng mô hình **BERT đa ngôn ngữ** (`paraphrase-multilingual-MiniLM-L12-v2`) để chuyển mô tả sách thành vector số, lưu vào **ChromaDB** phục vụ tìm kiếm ngữ nghĩa.

### 3.1. Cài đặt thư viện

```bash
pip install chromadb sentence-transformers pandas
```

> **💡 Lần đầu chạy**, mô hình BERT (~134MB) sẽ được tải tự động từ Hugging Face.

### 3.2. Chạy script tạo vector

```bash
# Chạy từ thư mục GỐC của dự án (không phải từ backend/)
python backend/src/bert-server/init_db.py
```

### 3.3. Kết quả

- **Thư mục đầu ra:** `chroma_db/` (tại thư mục gốc)
- Collection tên: `sach_fahasa`
- Mỗi cuốn sách được lưu với:
  - **ID:** Mã sản phẩm Fahasa (dạng string)
  - **Document:** Mô tả + review (đã ghép)
  - **Metadata:** Tên sách, giá bán
  - **Embedding:** Vector 384 chiều (tự động tạo bởi BERT)

### 3.4. Tạo file vector pickle (cho Hybrid Recommender)

Ngoài ChromaDB, hệ thống recommender cần file `du_lieu_sach_fahasa_vector.pkl` chứa vector embedding dưới dạng DataFrame. File này đã được tạo sẵn tại:

```
backend/src/bert-server/du_lieu_sach_fahasa_vector.pkl
```

Nếu cần tạo lại, bạn cần viết script riêng hoặc sử dụng `sentence-transformers` để encode toàn bộ sách và lưu kết quả dưới dạng pickle DataFrame với các cột: `id`, `title`, `price`, `vector`.

---

## 🤖 Bước 4 — Huấn Luyện Mô Hình Collaborative Filtering

Script `data/train_mock_cf.py` huấn luyện mô hình **Matrix Factorization** bằng PyTorch để dự đoán đánh giá sách của người dùng (phục vụ nhánh Collaborative Filtering trong Hybrid Recommender).

### 4.1. Cài đặt thư viện

```bash
pip install pandas numpy scikit-learn

# Cài PyTorch phiên bản CPU (nhẹ, không cần GPU)
pip install torch==2.2.1+cpu --extra-index-url https://download.pytorch.org/whl/cpu
```

### 4.2. Chạy huấn luyện

```bash
# Chạy từ thư mục GỐC của dự án
python data/train_mock_cf.py
```

### 4.3. Quá trình huấn luyện

1. Đọc danh sách sách từ `data/du_lieu_sach_fahasa_clean.csv`
2. Sinh dữ liệu rating giả lập cho 100 user (mỗi user đánh giá 15-30 cuốn)
3. Ánh xạ ID thật → Index (0 đến N-1)
4. Huấn luyện mô hình Matrix Factorization qua 15 epochs
5. Lưu model và mapping

### 4.4. Kết quả

| File                         | Mô tả                              |
| ---------------------------- | ----------------------------------- |
| `data/cf_model_pytorch.pth`  | Trọng số mô hình PyTorch           |
| `data/id_mappings.pkl`       | Mapping user_id ↔ index, book_id ↔ index |

---

## ⚙️ Bước 5 — Cấu Hình Biến Môi Trường

### 5.1. File `.env` (thư mục gốc — dùng cho Docker Compose)

Tạo file `.env` tại thư mục gốc của dự án:

```env
POSTGRES_USER=smartbook
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=dbsmartbook
DATABASE_URL=postgresql://smartbook:your_secure_password@db:5432/dbsmartbook
```

> **⚠️ Quan trọng:** Trong Docker Compose, host database là `db` (tên service), **không phải** `localhost`.

### 5.2. File `backend/.env` (dùng khi chạy backend local, không qua Docker)

```env
DATABASE_URL=postgresql://smartbook:your_secure_password@localhost:5433/dbsmartbook
SECRET_KEY=lumina-secret-key-change-in-production
```

> **💡 Lưu ý:** Port `5433` vì Docker map port `5432` bên trong container ra `5433` bên ngoài (xem `docker-compose.yml`).

---

## 🚀 Bước 6 — Khởi Chạy Hệ Thống

Có **2 cách** để chạy hệ thống: dùng Docker Compose (khuyến nghị) hoặc chạy thủ công từng service.

---

### Cách A: Dùng Docker Compose (Khuyến nghị) 🐳

Đây là cách đơn giản nhất, khởi chạy toàn bộ 3 service (PostgreSQL, Backend, Frontend) cùng lúc.

```bash
# Từ thư mục gốc của dự án
docker-compose up --build
```

Lệnh trên sẽ:
1. **Kéo image** `postgres:15-alpine` và build image cho Backend + Frontend
2. **Khởi tạo PostgreSQL** với user/password/database từ file `.env`
3. **Cài đặt Python dependencies** và chạy Backend FastAPI tại port `8001`
4. **Cài đặt Node.js dependencies** và chạy Frontend Vite tại port `3000`

**Dừng hệ thống:**

```bash
docker-compose down

# Nếu muốn xóa cả dữ liệu PostgreSQL:
docker-compose down -v
```

---

### Cách B: Chạy Thủ Công Từng Service

#### B1. Khởi chạy PostgreSQL bằng Docker

```bash
docker-compose up db -d
```

Hoặc chạy container PostgreSQL riêng:

```bash
docker run -d \
  --name smartbookdb \
  -e POSTGRES_USER=smartbook \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=dbsmartbook \
  -p 5433:5432 \
  postgres:15-alpine
```

#### B2. Khởi chạy Backend

```bash
cd backend

# Tạo virtual environment
python -m venv .venv

# Kích hoạt (Windows)
.venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt

# Chạy server
uvicorn src.server.main:app --host 0.0.0.0 --port 8001 --reload
```

> **💡 Khi backend khởi động**, nó sẽ tự động:
> - Tạo tất cả bảng trong PostgreSQL (`Base.metadata.create_all`)
> - Tạo 3 tài khoản demo (reader, staff, admin)
> - Kết nối ChromaDB và load mô hình Hybrid Recommender

#### B3. Khởi chạy Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Chạy dev server
npm run dev
```

---

## 🌱 Bước 7 — Seed Dữ Liệu Vào PostgreSQL

Sau khi hệ thống đã chạy (PostgreSQL đã sẵn sàng), cần nạp dữ liệu sách vào database.

### 7.1. Chạy script seed

```bash
cd backend
python -m src.scripts.seed_books
```

### 7.2. Quá trình seed

1. Kết nối tới PostgreSQL
2. **Xóa** bảng `user_actions` và `books` (nếu tồn tại)
3. **Tạo lại** bảng theo schema SQLAlchemy
4. Đọc file `data/du_lieu_sach_fahasa.json`
5. Loại bỏ sách trùng ID
6. Insert dữ liệu theo batch (mỗi batch 500 bản ghi)

### 7.3. Kết quả

```
Connecting to database...
Dropping tables...
Recreating tables...
Loaded 5616 books. Seeding...
Database seeded successfully!
```

> **⚠️ Lưu ý:** Script seed sẽ **xóa toàn bộ dữ liệu cũ** trong bảng `books` trước khi insert lại. Chỉ chạy khi muốn reset dữ liệu.

---

## ✅ Bước 8 — Kiểm Tra Hoạt Động

### 8.1. Kiểm tra Backend

Truy cập các URL sau trong trình duyệt:

| URL                                            | Mô tả                        |
| ---------------------------------------------- | ----------------------------- |
| `http://localhost:8001/health`                  | Health check                  |
| `http://localhost:8001/docs`                    | Swagger UI (API docs tương tác) |
| `http://localhost:8001/search?q=tình+yêu`      | Test tìm kiếm ngữ nghĩa      |
| `http://localhost:8001/books?page=1&per_page=10`| Lấy danh sách sách            |

### 8.2. Kiểm tra Frontend

Truy cập: **http://localhost:3000**

### 8.3. Kiểm tra recommender

```bash
curl http://localhost:8001/recommend/1/1041827?alpha=0.5
```

---

## 👤 Tài Khoản Demo

Hệ thống tự động tạo 3 tài khoản demo khi backend khởi động lần đầu:

| Vai trò    | Email              | Mật khẩu   |
| ---------- | ------------------ | ----------- |
| 📖 Reader  | `reader@lumina.io` | `demo123`   |
| 👷 Staff   | `staff@lumina.io`  | `demo123`   |
| 🔑 Admin   | `admin@lumina.io`  | `demo123`   |

---

## 📁 Cấu Trúc Thư Mục

```
BOOK-RECOMMENDER-SYSTEM/
│
├── 📂 data/                          # Dữ liệu & AI training
│   ├── scrap.py                      # Script cào dữ liệu từ Fahasa
│   ├── EDA.ipynb                     # Notebook phân tích & làm sạch dữ liệu
│   ├── du_lieu_sach_fahasa.json      # Dữ liệu thô (kết quả cào)
│   ├── du_lieu_sach_fahasa_clean.csv # Dữ liệu đã làm sạch
│   ├── train_mock_cf.py              # Script huấn luyện CF model
│   ├── cf_model_pytorch.pth          # Trọng số mô hình CF
│   ├── id_mappings.pkl               # Mapping ID cho CF
│   └── ai_config.json                # Cấu hình tham số AI
│
├── 📂 backend/                       # Backend FastAPI
│   ├── requirements.txt              # Python dependencies
│   ├── dockerfile                    # Docker build config
│   ├── alembic.ini                   # Alembic migration config
│   ├── .env                          # Biến môi trường (local dev)
│   └── 📂 src/
│       ├── 📂 server/
│       │   └── main.py               # Entry point — FastAPI app
│       ├── 📂 core/
│       │   └── database.py           # Kết nối PostgreSQL
│       ├── 📂 models/                # SQLAlchemy models
│       ├── 📂 controllers/           # API routes
│       ├── 📂 services/              # Business logic
│       │   └── recommender.py        # Hybrid Recommender Engine
│       ├── 📂 middlewares/           # Auth middleware (JWT, bcrypt)
│       ├── 📂 repositories/         # Data access layer
│       ├── 📂 schema/               # Pydantic schemas
│       ├── 📂 validators/           # Input validation
│       ├── 📂 scripts/
│       │   └── seed_books.py         # Script seed dữ liệu
│       └── 📂 bert-server/
│           ├── init_db.py            # Tạo ChromaDB vector store
│           ├── semantic_search.py    # Module tìm kiếm ngữ nghĩa
│           ├── recommendation.py     # Module gợi ý Content-Based
│           └── du_lieu_sach_fahasa_vector.pkl  # Vector embeddings
│
├── 📂 frontend/                      # Frontend React/TypeScript
│   ├── package.json                  # Node.js dependencies
│   ├── vite.config.ts                # Vite + proxy config
│   ├── Dockerfile                    # Docker build config
│   └── 📂 src/
│       ├── App.tsx                   # Root component
│       ├── main.tsx                  # Entry point
│       ├── 📂 components/           # UI components
│       ├── 📂 pages/                # Page components
│       ├── 📂 api/                  # API client (axios)
│       ├── 📂 context/              # React Context (auth, cart...)
│       └── 📂 hooks/                # Custom hooks
│
├── 📂 chroma_db/                     # ChromaDB persistent storage
├── docker-compose.yml                # Docker Compose orchestration
├── .env                              # Biến môi trường (Docker)
└── .gitignore
```

---

## 🔧 Xử Lý Sự Cố

### ❌ Lỗi kết nối PostgreSQL

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Giải pháp:**
- Kiểm tra Docker container PostgreSQL đang chạy: `docker ps`
- Kiểm tra port: local dùng `5433`, Docker internal dùng `5432`
- Kiểm tra `DATABASE_URL` trong file `.env` đúng host (`db` cho Docker, `localhost` cho local)

### ❌ ChromaDB không khởi tạo được

```
CHROMADB INIT ERROR: Collection sach_fahasa not found
```

**Giải pháp:**
- Đảm bảo đã chạy Bước 3 (init_db.py) để tạo collection
- Kiểm tra thư mục `chroma_db/` tồn tại và có dữ liệu
- Nếu dùng Docker, đảm bảo volume mount `./chroma_db:/app/chroma_db` trong `docker-compose.yml`

### ❌ Mô hình Recommender không load được

```
Recommender not available (503)
```

**Giải pháp:**
- Đảm bảo đã chạy Bước 4 (train_mock_cf.py)
- Kiểm tra file `data/cf_model_pytorch.pth` và `data/id_mappings.pkl` tồn tại
- Kiểm tra file `backend/src/bert-server/du_lieu_sach_fahasa_vector.pkl` tồn tại

### ❌ Frontend không gọi được API

```
Network Error / CORS Error
```

**Giải pháp:**
- Đảm bảo backend đang chạy tại port `8001`
- Kiểm tra cấu hình proxy trong `frontend/vite.config.ts` (mặc định proxy `/api` → `http://localhost:8001`)
- Frontend gọi API qua prefix `/api/...`, Vite sẽ tự rewrite bỏ prefix và forward tới backend

### ❌ Lỗi cào dữ liệu (Cloudflare chặn)

```
Error 403 / Cloudflare challenge
```

**Giải pháp:**
- `cloudscraper` tự xử lý Cloudflare challenge, nhưng có thể thất bại nếu Fahasa nâng cấp bảo mật
- Thử tăng `time.sleep()` giữa các request (hiện tại 1.5s)
- Kiểm tra IP có bị rate-limit không

---

## 📊 Tóm Tắt Luồng Chạy

```
scrap.py ──► du_lieu_sach_fahasa.json
                    │
                    ▼
              EDA.ipynb ──► du_lieu_sach_fahasa_clean.csv
                    │                    │
                    ▼                    ▼
             init_db.py            train_mock_cf.py
                    │                    │
                    ▼                    ▼
              chroma_db/         cf_model_pytorch.pth
              (Vector DB)        id_mappings.pkl
                    │                    │
                    └────────┬───────────┘
                             ▼
                    docker-compose up
                    (PostgreSQL + Backend + Frontend)
                             │
                             ▼
                      seed_books.py
                    (Nạp sách vào DB)
                             │
                             ▼
                   ✅ Hệ thống sẵn sàng!
                   http://localhost:3000
```

---

> **📝 Lưu ý cuối:** Thứ tự các bước rất quan trọng. Đảm bảo hoàn thành từng bước trước khi chuyển sang bước tiếp theo, đặc biệt là các bước tạo dữ liệu (1→2→3→4) phải hoàn thành trước khi khởi chạy hệ thống (bước 6).
