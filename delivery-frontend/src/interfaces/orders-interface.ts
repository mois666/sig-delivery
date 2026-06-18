import { Calendar, Package } from "lucide-react";

export type OrderType = 'estandar' | 'programada';
export type OrderStatus = 'pending' | 'active' | 'pre-assigned' | 'assigned' | 'canceled' | 'collected' | 'running' | 'arrived' | 'delivered' | 'not-delivered' | 'available' | 'accepted' | 'on_the_way' | 'cancelled';

export interface IOrderAssignment {
    id: number;
    order_id: number;
    user_id: number;
    status: string;
    status_metadata: {
        collected_at?: string | null;
        running_at?: string | null;
        arrived_at?: string | null;
        delivered_at?: string | null;
        'not-delivered_at'?: string | null;
    } | null;
    created_at: string;
    updated_at: string;
}

// ─── ZoneCrossing ──────────────────────────────────────────────────────────────

export interface IZoneCrossing {
    zone_id: number;
    zone_name: string;
    distance_km: number;
    extra_rate: number;
    cost: number;
}

// ─── Address Metadata ─────────────────────────────────────────────────────────

export interface IAddressMetadata {
    city_name: string;
    country_name: string;
    formatted_address: string;
    pickup: { lat: number; lng: number };
    delivery: { lat: number; lng: number };
    address_a: string;
    address_b: string;
    delivery_time: string;
    delivery_fee: number;
    // Datos de ruta (OSRM + PricingService)
    route_distance_km: number | null;
    total_distance_km: number | null;
    normal_distance_km: number | null;
    normal_cost: number | null;
    duration_seconds: number | null;
    duration: string | null;
    base_fee: number | null;
    zones: IZoneCrossing[];
    total_delivery_fee: number | null;
    route_geometry: any | null;
}

// ─── IOrder (legacy) ──────────────────────────────────────────────────────────

export interface IOrder {
    id: string;
    type: OrderType;
    fee: number;
    rewardPoints: number;
    bonusPoints: number;
    distance: string;
    zone: string;
    pickupAddress: string;
    deliveryAddress: string;
    customerName: string;
    delivery_time: string;
    address_a?: string | null;
    address_b?: string | null;
    address_metadata?: IAddressMetadata;
    expiresAt: Date;
    status: OrderStatus;
    assignedTo?: string;
    createdAt: Date;
    acceptedAt?: Date;
    completedAt?: Date;
    assignments?: IOrderAssignment[];
}

export type IOrderType = 'estandar' | 'programada';
export const orderTypeConfig: Record<IOrderType, { icon: any; label: string; color: string }> = {
    estandar: { icon: Package, label: 'Estándar', color: 'text-success' },
    programada: { icon: Calendar, label: 'Programada', color: 'text-primary' },
};

// ─── IAddOrder ────────────────────────────────────────────────────────────────

export interface IAddOrder {
    id: string;
    type: 'estandar' | 'programada';
    client_name: string;
    description: string;
    pickup: string;   // "lat,lng"
    delivery: string;   // "lat,lng"
    address_a?: string | null;
    address_b?: string | null;
    delivery_time: string;
    delivery_fee: number;
    currency: string;
    status: string;
    duration: string;
    reward_points: number;
    address_metadata?: IAddressMetadata;
    pricing_details?: {
        route_distance_km: number;
        base_fee: number;
        normal_distance_km: number;
        normal_cost: number;
        zones: IZoneCrossing[];
        total_delivery_fee: number;
        duration_seconds: number;
    } | null;
    // Campos de reserva pre-assigned
    reserved_driver_id?: number | null;
    reserved_at?: string | null;
    reservation_expires_at?: string | null;
    assignments?: IOrderAssignment[];
}