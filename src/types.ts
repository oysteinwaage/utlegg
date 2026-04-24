import type { User } from 'firebase/auth';

export type Role = 'ADMIN' | 'BRUKER' | 'TEST_USER';

export interface UserProfile {
  name: string;
  email: string | null;
  photoURL: string | null;
  roles: Role[];
  createdAt: number;
}

export interface ExpenseRecord {
  type: 'expense';
  description: string;
  amount: number;
  currency: string;
  amountInDefault: number;
  paidBy: string;
  timestamp: number;
  defaultCurrency?: string;
}

export interface SettlementRecord {
  type: 'settlement';
  description: string;
  debtorId: string;
  creditorId: string;
  debtAmount: number;
  user1Id: string;
  user2Id: string;
  user1Amount: number;
  user2Amount: number;
  currency: string;
  transferred: boolean;
  timestamp: number;
  defaultCurrency?: string;
}

export type AnyEntry = ExpenseRecord | SettlementRecord;

export interface Sharing {
  id: string;
  name: string;
  defaultCurrency: string;
  participants: Record<string, true>;
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  lastSettlementAt: number | null;
  expenses?: Record<string, AnyEntry>;
}

export interface AuthContextValue {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}
