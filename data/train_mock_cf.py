import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import pickle
import random
import os

# --- Cấu hình đường dẫn ---
DATA_PATH = 'data/du_lieu_sach_fahasa_clean.csv'
MODEL_SAVE_PATH = 'cf_model_pytorch.pth'
MAPPING_SAVE_PATH = 'id_mappings.pkl'

import sys
# Thêm đường dẫn thư mục gốc vào sys.path để có thể import từ backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.src.models.matrix_factorization import MatrixFactorization

# --- 2. CHUẨN BỊ DỮ LIỆU ---
class RatingDataset(Dataset):
    def __init__(self, users, items, ratings):
        self.users = torch.tensor(users, dtype=torch.long)
        self.items = torch.tensor(items, dtype=torch.long)
        self.ratings = torch.tensor(ratings, dtype=torch.float32)

    def __len__(self):
        return len(self.ratings)

    def __getitem__(self, idx):
        return self.users[idx], self.items[idx], self.ratings[idx]

def generate_mock_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Không tìm thấy {DATA_PATH}")
    
    df_books = pd.read_csv(DATA_PATH)
    book_ids = df_books['id'].dropna().astype(str).unique().tolist()
    
    mock_ratings = []
    num_users = 100
    print(f"Đang sinh dữ liệu giả cho {num_users} users...")
    
    for user_id in range(1, num_users + 1):
        num_rated = random.randint(15, 30)
        rated_books = random.sample(book_ids, num_rated)
        for book_id in rated_books:
            rating = np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.1, 0.2, 0.3, 0.3])
            mock_ratings.append({'user_id': str(user_id), 'book_id': book_id, 'rating': rating})
            
    return pd.DataFrame(mock_ratings)

# --- 3. QUÁ TRÌNH HUẤN LUYỆN ---
def train():
    df_ratings = generate_mock_data()
    
    # Bước cực kỳ quan trọng: Ánh xạ ID thật sang Index (0 đến N-1)
    user_unique = df_ratings['user_id'].unique()
    book_unique = df_ratings['book_id'].unique()
    
    user2idx = {user: idx for idx, user in enumerate(user_unique)}
    book2idx = {book: idx for idx, book in enumerate(book_unique)}
    
    df_ratings['user_idx'] = df_ratings['user_id'].map(user2idx)
    df_ratings['book_idx'] = df_ratings['book_id'].map(book2idx)
    
    # Khởi tạo DataLoader
    dataset = RatingDataset(df_ratings['user_idx'].values, df_ratings['book_idx'].values, df_ratings['rating'].values)
    dataloader = DataLoader(dataset, batch_size=256, shuffle=True)
    
    # Khởi tạo mô hình
    model = MatrixFactorization(num_users=len(user_unique), num_items=len(book_unique), emb_size=50)
    criterion = nn.MSELoss() # Hàm mất mát: Trung bình bình phương sai số
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=1e-5) # Adam Optimizer
    
    epochs = 15
    print("Bắt đầu huấn luyện...")
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for users, items, ratings in dataloader:
            optimizer.zero_grad()
            predictions = model(users, items)
            loss = criterion(predictions, ratings)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} - Loss: {total_loss/len(dataloader):.4f}")
        
    # Lưu Model và Mappings
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    with open(MAPPING_SAVE_PATH, 'wb') as f:
        pickle.dump({'user2idx': user2idx, 'book2idx': book2idx}, f)
        
    print(f"Hoàn tất! Đã lưu model tại {MODEL_SAVE_PATH} và mappings tại {MAPPING_SAVE_PATH}")

if __name__ == '__main__':
    train()