import torch
import torch.nn as nn

class MatrixFactorization(nn.Module):
    def __init__(self, num_users, num_items, emb_size=50):
        super(MatrixFactorization, self).__init__()
        # Tạo ma trận nhúng cho User và Item
        self.user_emb = nn.Embedding(num_users, emb_size)
        self.item_emb = nn.Embedding(num_items, emb_size)
        
        # Thêm Bias (Độ lệch) để model dự đoán chuẩn hơn
        self.user_bias = nn.Embedding(num_users, 1)
        self.item_bias = nn.Embedding(num_items, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))
        
        # Khởi tạo trọng số ngẫu nhiên nhỏ
        nn.init.normal_(self.user_emb.weight, std=0.01)
        nn.init.normal_(self.item_emb.weight, std=0.01)

    def forward(self, user, item):
        # Tích vô hướng giữa vector user và vector item
        dot_product = (self.user_emb(user) * self.item_emb(item)).sum(dim=1)
        # Cộng thêm các bias
        prediction = dot_product + self.user_bias(user).squeeze() + self.item_bias(item).squeeze() + self.global_bias
        return prediction
