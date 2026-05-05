import pandas as pd
import chromadb
from chromadb.utils import embedding_functions


chroma_client = chromadb.PersistentClient(path="./chroma_db")
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name='paraphrase-multilingual-MiniLM-L12-v2'
)
collection = chroma_client.get_collection(name="sach_fahasa", embedding_function=sentence_transformer_ef)

def semantic(cau_hoi, num_kq=5):
    ket_qua = collection.query(
        query_texts=[cau_hoi],
        n_results=num_kq 
    )

    danh_sach_sach = ket_qua['metadatas'][0]
    return danh_sach_sach
    
cau_hoi_cua_ban = "tôi đang buồn và muốn tìm sự bình yên"

print(f"\nAI đang tìm kiếm sách cho câu nói: '{cau_hoi_cua_ban}'\n")
ket_qua = semantic(cau_hoi_cua_ban)
print(ket_qua)