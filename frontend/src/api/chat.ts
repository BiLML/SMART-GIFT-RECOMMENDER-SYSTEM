import client from './client';

export interface Conversation {
  id: number;
  reader_id: number;
  reader_name: string;
  staff_id: number | null;
  staff_name: string;
  subject: string;
  status: string;
  unread_count: number;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export async function createConversation(subject: string = 'Hỗ trợ chung'): Promise<Conversation> {
  const res = await client.post('/chat/conversations', { subject });
  return res.data;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await client.get('/chat/conversations');
  return res.data;
}

export async function getMessages(conversationId: number): Promise<ChatMessage[]> {
  const res = await client.get(`/chat/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendMessage(conversationId: number, content: string): Promise<ChatMessage> {
  const res = await client.post(`/chat/conversations/${conversationId}/messages`, { content });
  return res.data;
}

export async function closeConversation(conversationId: number) {
  const res = await client.put(`/chat/conversations/${conversationId}/close`);
  return res.data;
}
