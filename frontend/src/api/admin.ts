import client from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function getUsers(): Promise<User[]> {
  const res = await client.get('/admin/users');
  return res.data;
}

export async function updateUserRole(userId: number, role: string) {
  const res = await client.put(`/admin/users/${userId}/role`, null, { params: { role } });
  return res.data;
}

export interface AIConfig {
  alpha: number;
  top_n: number;
  version: string;
  last_retrained: string;
}

export interface AIPerformance {
  current_metrics: {
    rmse: number;
    precision_at_k: number;
    recall_at_k: number;
    f1_score: number;
    training_loss: number;
    validation_loss: number;
  };
  training_history: {
    epoch: number;
    loss: number;
    val_loss: number;
  }[];
}

export async function getAIConfig(): Promise<AIConfig> {
  const res = await client.get('/admin/ai/config');
  return res.data;
}

export async function updateAIConfig(alpha: number, top_n: number): Promise<AIConfig> {
  const res = await client.put('/admin/ai/config', { alpha, top_n });
  return res.data;
}

export async function getAIPerformance(): Promise<AIPerformance> {
  const res = await client.get('/admin/ai/performance');
  return res.data;
}

export async function retrainAIModel(): Promise<{ message: string; new_version: string; last_retrained: string }> {
  const res = await client.post('/admin/ai/retrain');
  return res.data;
}

export interface RevenueStats {
  total_revenue: number;
  revenue_history: { month: string; revenue: number }[];
}

export interface BackupRecord {
  filename: string;
  size: number;
  created_at: string;
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const res = await client.get('/admin/stats/revenue');
  return res.data;
}

export async function createBackup(): Promise<{ message: string; filename: string }> {
  const res = await client.post('/admin/system/backup');
  return res.data;
}

export async function getBackups(): Promise<BackupRecord[]> {
  const res = await client.get('/admin/system/backups');
  return res.data;
}
