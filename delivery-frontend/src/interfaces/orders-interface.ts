import { Calendar, Package, Zap } from "lucide-react";


export type OrderType = 'express' | 'estandar' | 'programada';
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
    urgency: 'low' | 'medium' | 'high';
    expiresAt: Date;
    status: OrderStatus;
    assignedTo?: string;
    createdAt: Date;
    acceptedAt?: Date;
    completedAt?: Date;
}
export type IOrderType = 'express' | 'estandar' | 'programada';
export const orderTypeConfig: Record<IOrderType, { icon: any; label: string; color: string }> = {
    express: { icon: Zap, label: 'Express', color: 'text-warning' },
    estandar: { icon: Package, label: 'Estándar', color: 'text-success' },
    programada: { icon: Calendar, label: 'Programada', color: 'text-primary' },
};
export interface IAddOrder {
    id: string;
    type: 'estandar' | 'express' | 'programada';
    client_name: string;
    description: string;
    pickup: string;            // Dirección de recogida
    delivery: string;          // Dirección de entrega
    address: string; // Detalles extra
    delivery_fee: number;
    urgency: 'baja' | 'media' | 'alta';
    currency: string;
    status: string;
    duration: string;
    points: number;
}