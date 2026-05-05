import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

df = pd.read_pickle('backend/src/bert-server/du_lieu_sach_fahasa_vector.pkl')
df = df.drop_duplicates(subset=['id']).reset_index(drop=True)
vector_sach_matrix = np.array(df['vector'].tolist())

def goi_y_sach(id_sachdangxem, num_kq=5):
    if id_sachdangxem not in df['id'].values:
        return "Sách không tồn tại trên hệ thống"
    # Lấy vector của sách đang xem
    vector_sachdangxem = df[df['id'] == id_sachdangxem]['vector'].values[0]
    
    # Tính độ tương đồng cosine với các sách còn lại
    diem_tuong_dong = cosine_similarity([vector_sachdangxem], vector_sach_matrix)[0]
    df_kq = df.copy()
    df_kq['diem_tuong_dong'] = diem_tuong_dong

    df_kq = df_kq[df_kq['id'] != id_sachdangxem]
    df_kq = df_kq.sort_values(by='diem_tuong_dong', ascending=False).head(num_kq)

    return df_kq[['id', 'title', 'price', 'diem_tuong_dong']]

# Lấy thử ID của cuốn "Một Ngày Bình Thường Để Thương Mình" từ kết quả lúc nãy của bạn
id_sach_test = 1041827

print(f"\nĐang tìm sách gợi ý cho độc giả đang xem sách ID: {id_sach_test}...\n")
ket_qua = goi_y_sach(id_sach_test)

pd.set_option('display.max_colwidth', None) # cho phép hiển thị toàn bộ nội dung cột
pd.set_option('display.expand_frame_repr', False) # cho phép hiển thị toàn bộ dataframe
print(ket_qua)