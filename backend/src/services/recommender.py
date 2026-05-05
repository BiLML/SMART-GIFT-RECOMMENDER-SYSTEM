import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
import os
from src.models.matrix_factorization import MatrixFactorization

class HybridRecommender:
    def __init__(self, vector_path, model_path, mapping_path):
        # 1. Load dữ liệu Vector (Content-Based)
        self.df_sach = pd.read_pickle(vector_path)
        self.vector_matrix = np.array(self.df_sach['vector'].tolist())
        
        # 2. Load Mappings
        with open(mapping_path, 'rb') as f:
            mappings = pickle.load(f)
        self.user2idx = mappings['user2idx']
        self.book2idx = mappings['book2idx']
        
        # 3. Load Model PyTorch (Collaborative Filtering)
        self.model = MatrixFactorization(len(self.user2idx), len(self.book2idx))
        self.model.load_state_dict(torch.load(model_path))
        self.model.eval()

    def get_recommendations(self, user_id, book_id, alpha=0.5, top_n=12):
        book_id = int(book_id)
        user_id = str(user_id)
        
        if book_id not in self.df_sach['id'].values:
            return None

        # --- Nhánh 1: Content-Based Score ---
        # Lấy vector của sách hiện tại và tính cosine similarity
        target_vec = self.df_sach[self.df_sach['id'] == book_id]['vector'].values[0]
        cb_scores = cosine_similarity([target_vec], self.vector_matrix)[0]
        
        df_res = self.df_sach[['id', 'title', 'price']].copy()
        df_res['cb_score'] = np.clip(cb_scores, 0, 1)

        # --- Nhánh 2: Collaborative Filtering Score ---
        # Xử lý bài toán Cold-Start cho User mới
        if user_id not in self.user2idx:
            df_res['cf_score'] = 0.0
            df_res['final_score'] = df_res['cb_score'] # User mới thì dùng 100% CB
        else:
            u_idx = self.user2idx[user_id]
            # Chuyển tất cả Book ID sang index của model
            b_indices = [self.book2idx.get(str(id), 0) for id in df_res['id']]
            
            user_t = torch.tensor([u_idx] * len(df_res))
            item_t = torch.tensor(b_indices)
            
            # Dự đoán và chuẩn hóa về [0, 1] (Giả sử rating gốc 1-5)
            with torch.no_grad():
                preds = self.model(user_t, item_t).numpy()
            df_res['cf_score'] = np.clip((preds - 1.0) / 4.0, 0, 1)
            
            # Phạt điểm 0 cho những sách chưa có trong hệ thống CF
            df_res.loc[~df_res['id'].astype(str).isin(self.book2idx.keys()), 'cf_score'] = 0.0
            
            # --- Kết hợp Hybrid ---
            df_res['final_score'] = (alpha * df_res['cb_score']) + ((1 - alpha) * df_res['cf_score'])

        # Loại bỏ chính cuốn sách đang xem và trả về kết quả
        return df_res[df_res['id'] != book_id].sort_values('final_score', ascending=False).head(top_n).to_dict('records')