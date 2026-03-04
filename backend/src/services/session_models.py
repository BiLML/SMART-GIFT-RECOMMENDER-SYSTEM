from collections import defaultdict # Ma tran thua -> tranh tran Ram
from repositories.session_repository import SessionRepository

class TransitionMatrixRecommender:
    def __init__(self, repository: SessionRepository):
        self.repository = repository
        self.transition_matrix = defaultdict(lambda: defaultdict(float))

    # Ma tran chuyen doi (dua tren Markov Chain)
    def train_model(self): # chay dinh ky de tinh toan lai ma tran
        actions = self.repository.get_all_sessions

        session_dict = defaultdict(list) # gom nhom
        for session_id, book_id in actions:
            session_dict[session_id].append(book_id)
        
        # C( A -> B ) : So lan sach B duoc xem ngay sau sach A
        counts = defaultdict(lambda: defaultdict(int))
        for _, sequence in session_dict.items():
            for i in range(len(sequence) - 1):
                current_book = sequence[i]
                next_book = sequence[i + 1]
                counts[current_book][next_book] += 1

        # Xac suat P( B | A )
        for current_book, transitions in counts.items():
            total_transitions = sum(transitions.values())
            for next_book, count in transitions.items():
                self.transition_matrix[current_book][next_book] = count / total_transitions

        print("Huan luyen ma tran thanh cong!")
    
    # Du doan sach tiep theo
    def predict_next_book(self, current_book_id: str, top_k: int = 5):
        if current_book_id not in self.transition_matrix:
            return [] 
        
        next_books = self.transition_matrix[current_book_id]
        sorted_books = sorted(next_books.items(), key=lambda item: item[1], reverse=True)
        return sorted_books[:top_k]
        

