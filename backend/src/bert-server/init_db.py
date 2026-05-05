import pandas as pd
import chromadb
from chromadb.utils import embedding_functions 

df = pd.read_csv('data/du_lieu_sach_fahasa_clean.csv')
df = df.drop_duplicates(subset=['id']).reset_index(drop=True)

if 'reviews' not in df.columns:
    df['review'] = ""

df['description'] = df['description'].fillna('')
df['description'] = df['description'].astype(str)

df['review'] = df['review'].fillna("")
df['review'] = df['review'].astype(str)

df['all_text'] = df['description'] + ' ' + df['review']

# 2. Khởi tạo ChromaDB (Dữ liệu sẽ được lưu cứng vào thư mục chroma_db)
print("Đang khởi tạo Vector Database...")
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# 3. Khai báo "bộ não" BERT (ChromaDB sẽ tự động gọi mô hình này)
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name='paraphrase-multilingual-MiniLM-L12-v2'
)

# 4. Tạo "Kho chứa" (Collection) giống như tạo một bảng trong SQL
# Nếu đã có kho cũ thì xóa đi làm lại cho sạch
try:
    chroma_client.delete_collection(name="sach_fahasa")
except:
    pass

collection = chroma_client.create_collection(
    name="sach_fahasa",
    embedding_function=sentence_transformer_ef
)

print(f"Bắt đầu nhúng và lưu {len(df)} cuốn sách vào DB")

# ChromaDB yêu cầu chuẩn bị dữ liệu dưới dạng danh sách (list)
ids = df['id'].astype(str).tolist() # Bắt buộc ID phải là dạng chữ (string)
documents = df['all_text'].tolist()
metadatas = df[['title', 'price']].to_dict('records') # Lưu kèm thông tin phụ (Metadata)

# Đưa dữ liệu vào DB theo từng đợt nhỏ (batch) để không làm treo máy
batch_size = 100
for i in range(0, len(ids), batch_size):
    collection.add(
        ids=ids[i:i+batch_size],
        documents=documents[i:i+batch_size],
        metadatas=metadatas[i:i+batch_size]
    )
    print(f"Đã lưu {min(i+batch_size, len(ids))}/{len(ids)} sách...")

print("Database đã sẵn sàng hoạt động.")