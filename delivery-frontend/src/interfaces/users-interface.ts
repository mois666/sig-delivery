import { ICity } from './city-interface';

export type UserRole        = 'super_admin' | 'admin' | 'driver' | 'client';
export type UserStatus      = 'active' | 'inactive' | 'suspended';
export type TransportType   = 'on_foot' | 'bike' | 'motorcycle' | 'car';

export interface IUser {
  id:             number;
  name:           string;
  email:          string;
  phone:          string;
  pin?:           string;
  city_id?:       number;
  city?:          ICity;
  transport_type?: TransportType;
  role:           UserRole;
  status:         UserStatus;
  points:         number;
  level?:         number;
  wallet?:        Wallet;
  created_at?:    string;
}

export interface DeliveryResponse {
  message: string;
  user:    IUser;
}

/* Wallet */
export interface Wallet {
  balance: number;
}