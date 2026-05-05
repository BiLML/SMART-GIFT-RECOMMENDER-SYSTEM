import client from './client';

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email: string | null;
    phone: string | null;
    role: string;
  };
}

export interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await client.post('/auth/login', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await client.post('/auth/register', data);
  return res.data;
}

export async function getProfile(): Promise<UserProfile> {
  const res = await client.get('/auth/me');
  return res.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await client.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(data: any): Promise<{ message: string }> {
  const res = await client.post('/auth/reset-password', data);
  return res.data;
}

export interface UserProfileUpdate {
  username?: string;
  email?: string;
  phone?: string;
}

export async function updateProfile(data: UserProfileUpdate): Promise<{ message: string; user: any }> {
  const res = await client.put('/auth/profile', data);
  return res.data;
}

export async function changePassword(data: any): Promise<{ message: string }> {
  const res = await client.put('/auth/change-password', data);
  return res.data;
}

export async function deleteAccount(): Promise<{ message: string }> {
  const res = await client.delete('/auth/account');
  return res.data;
}
