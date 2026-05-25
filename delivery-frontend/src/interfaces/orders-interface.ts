import { Calendar, Package } from "lucide-react";

export type OrderType = 'estandar' | 'programada';
export type OrderStatus = 'available' | 'accepted' | 'on_the_way' | 'delivered' | 'cancelled';
export interface IOrder {
    id: string;
    type: OrderType;
    fee: number;
    points: number;
    bonusPoints: number;
    distance: string;
    zone: string;
    pickupAddress: string;
    deliveryAddress: string;
    customerName: string;
    delivery_time: string;
    address_a?: string | null;
    address_b?: string | null;
    address_metadata?: any;
    expiresAt: Date;
    status: OrderStatus;
    assignedTo?: string;
    createdAt: Date;
    acceptedAt?: Date;
    completedAt?: Date;
}
export type IOrderType = 'estandar' | 'programada';
export const orderTypeConfig: Record<IOrderType, { icon: any; label: string; color: string }> = {
    estandar: { icon: Package, label: 'Estándar', color: 'text-success' },
    programada: { icon: Calendar, label: 'Programada', color: 'text-primary' },
};
export interface IAddOrder {
    id: string;
    type: 'estandar' | 'programada';
    client_name: string;
    description: string;
    pickup: string;            // Dirección de recogida
    delivery: string;          // Dirección de entrega
    address_a?: string | null; // Punto de recogida dirección manual
    address_b?: string | null; // Punto de entrega dirección manual
    delivery_time: string;
    delivery_fee: number;
    currency: string;
    status: string;
    duration: string;
    points: number;
}