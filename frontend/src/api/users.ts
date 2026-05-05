import client from './client';

export interface UserInfo {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export async function getAllUsers(): Promise<UserInfo[]> {
  const res = await client.get('/users/');
  return res.data;
}

export async function notifyUsers(userIds: number[], subject: string, body: string) {
  const res = await client.post('/users/notify', {
    user_ids: userIds,
    subject,
    body
  });
  return res.data;
}
