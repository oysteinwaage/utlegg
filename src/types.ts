export type Role = 'ADMIN' | 'BRUKER' | 'TEST_USER';

export type ExpenseCategory =
  | 'dagligvarer'
  | 'hjem_og_hage'
  | 'fritid'
  | 'restaurant_og_uteliv'
  | 'transport_og_reise'
  | 'klaer_og_tilbehoer'
  | 'ovrig_forbruk'
  | 'kjoeretoey'
  | 'helse_og_velvare';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface UserProfile {
  name: string;
  email: string | null;
  photoURL: string | null;
  roles: Role[];
  createdAt: number;
  preferredCurrency?: string;
}

export interface ExpenseRecord {
  type: 'expense';
  description: string;
  amount: number;
  currency: string;
  amountInDefault: number;
  paidBy: string;
  timestamp: number;
  splitAmong?: string[];
  defaultCurrency?: string;
  category?: ExpenseCategory;
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
  currentUser: AuthUser | null;
  currentUserId: string;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}
