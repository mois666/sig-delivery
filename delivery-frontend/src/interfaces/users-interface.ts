export type UserRole = 'admin' | 'driver';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface IUser {
  id: number;
  name: string;
  phone: string;
  pin?: string;
  city: string;
  role: UserRole;
  status: UserStatus;
  points: number;
  level?: number;
  wallet?: Wallet;
  created_at?: string;
}

export interface DeliveryResponse {
  message: string;
  user: IUser;
}
/* Wallet */
export interface Wallet {
  balance: number;
}