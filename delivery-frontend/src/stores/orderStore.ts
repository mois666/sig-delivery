import { create } from 'zustand';
import { IOrder, IAddOrder } from '@/interfaces/orders-interface';
export type { OrderStatus } from '@/interfaces/orders-interface';
import { appDB } from '@/api/appDB';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface OrderState {
  orders: any[];
  availableOrders: IAddOrder[];
  activeOrder: IOrder | null;
  completedOrders: IOrder[];
  isLoading: boolean;

  // Estado de pre-asignación
  preAssignedOrder: IAddOrder | null;
  reservationExpiresAt: string | null;

  // Acciones
  fetchOrders: () => Promise<void>;
  fetchAvailableOrders: () => Promise<void>;
  addOrder: (order: IAddOrder) => Promise<boolean>;
  preAssignOrder: (orderId: string, driverId: number) => Promise<void>;
  startDelivery: (orderId: string, driverId: number) => Promise<void>;
  abortDelivery: (orderId: string, driverId: number) => Promise<void>;
  acceptOrder: (orderId: string, driverId: string) => Promise<void>; // legacy
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  editOrder: (orderId: string, data: any) => Promise<boolean>;
  completeOrder: (orderId: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  addOrderLocally: (newOrder: any) => void;
  removeOrderLocally: (orderId: string) => void;
  setPreAssignedOrder: (order: IAddOrder | null) => void;
  clearPreAssignment: () => void;
}

/** Normaliza la orden para el activeOrder usando el estado del assignment si está assigned */
const resolveOrder = (order: any): any => {
  if (!order) return null;
  if (order.status === 'assigned' && order.assignments && order.assignments.length > 0) {
    return {
      ...order,
      status: order.assignments[0].status,
    };
  }
  return order;
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  availableOrders: [],
  activeOrder: null,
  completedOrders: [],
  isLoading: false,
  preAssignedOrder: null,
  reservationExpiresAt: null,

  /** Carga todas las órdenes (admin / general) */
  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.get('/orders');
      const mappedOrders = (data.orders || []).map(resolveOrder);
      set({
        orders: mappedOrders,
        availableOrders: mappedOrders.filter((o: any) => o.status === 'active'),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Error al sincronizar pedidos');
      }
    }
  },

  /** Carga solo los pedidos con status=active para el driver */
  fetchAvailableOrders: async () => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.get('/orders/available');
      const mapped = (data.orders || []).map(resolveOrder);
      set({ availableOrders: mapped, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Error al cargar pedidos disponibles');
      }
    }
  },

  /** Envía un nuevo pedido al backend */
  addOrder: async (orderData: IAddOrder) => {
    try {
      const user = useAuthStore.getState().user;
      const city_id = user?.city?.id ?? 1;
      const { data } = await appDB.post<IAddOrder>('/orders', { ...orderData, city_id });
      const resolvedData = resolveOrder(data);
      set((state) => ({
        availableOrders: [resolvedData, ...state.availableOrders],
      }));
      await get().fetchOrders();
      toast.success('¡Carrera publicada!');
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message);
      }
      return false;
    }
  },

  /**
   * Pre-asigna una orden (reserva de 5 minutos).
   * Quita la orden de availableOrders y la guarda en preAssignedOrder.
   */
  preAssignOrder: async (orderId: string, driverId: number) => {
    try {
      const { data } = await appDB.put(`/orders/${orderId}/pre-assign`, {
        driver_id: driverId,
      });
      set((state) => ({
        availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
        preAssignedOrder: data,
        reservationExpiresAt: data.reservation_expires_at ?? null,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'El pedido ya no está disponible');
      }
    }
  },

  /**
   * Confirma el inicio de la carrera (pre-assigned → assigned/collected).
   * Limpia preAssignedOrder y establece activeOrder.
   */
  startDelivery: async (orderId: string, driverId: number) => {
    try {
      const { data } = await appDB.put(`/orders/${orderId}/start`, {
        driver_id: driverId,
      });
      const resolved = resolveOrder(data);
      set({
        preAssignedOrder: null,
        reservationExpiresAt: null,
        activeOrder: resolved,
      });
      toast.success('¡Carrera iniciada!');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Error al iniciar carrera');
      }
    }
  },

  /**
   * Aborta la reserva (driver rechaza el pedido).
   * Devuelve el pedido a availableOrders y limpia el estado.
   * El backend descuenta 5 puntos al driver.
   */
  abortDelivery: async (orderId: string, driverId: number) => {
    try {
      const { data } = await appDB.put(`/orders/${orderId}/abort-pre-assign`, {
        driver_id: driverId,
      });
      set((state) => ({
        preAssignedOrder: null,
        reservationExpiresAt: null,
        availableOrders: data.order
          ? [data.order, ...state.availableOrders.filter((o) => o.id !== orderId)]
          : state.availableOrders,
      }));
      toast.warning('Carrera abortada. -5 puntos descontados.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Error al abortar carrera');
      }
    }
  },

  /** @deprecated — alias legacy que ahora llama a preAssignOrder */
  acceptOrder: async (orderId: string, driverId: string) => {
    await get().preAssignOrder(orderId, parseInt(driverId));
  },

  /** Actualiza el estado del assignment (running, arrived, etc.) */
  updateOrderStatus: async (orderId: string, status: string) => {
    try {
      const { data } = await appDB.patch<IOrder>(`/orders/${orderId}/status`, { status });
      const resolvedData = resolveOrder(data);
      set((state) => ({
        activeOrder: state.activeOrder?.id === orderId ? resolvedData : state.activeOrder,
      }));
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  },

  /** Edita una orden */
  editOrder: async (orderId: string, orderData: any) => {
    try {
      const { data } = await appDB.put(`/orders/${orderId}`, orderData);
      const resolvedData = resolveOrder(data.order);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? resolvedData : o)),
        availableOrders: state.availableOrders.map((o) => (o.id === orderId ? resolvedData : o)),
        activeOrder: state.activeOrder?.id === orderId ? resolvedData : state.activeOrder,
      }));
      toast.success('Pedido actualizado correctamente');
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || 'Error al actualizar el pedido');
      }
      return false;
    }
  },

  /** Finaliza la entrega → acredita recompensas en el backend */
  completeOrder: async (orderId: string) => {
    try {
      const { data } = await appDB.patch<IOrder>(`/orders/${orderId}/complete`);
      const resolvedData = resolveOrder(data);
      set((state) => ({
        activeOrder: null,
        completedOrders: [resolvedData, ...state.completedOrders],
      }));
      toast.success('¡Entrega completada!');
    } catch (error) {
      toast.error('Error al finalizar pedido');
    }
  },

  /** Elimina/Cancela una orden (admin) */
  removeOrder: async (orderId: string) => {
    try {
      await appDB.delete(`/orders/${orderId}`);
      set((state) => ({
        availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
      }));
      toast.success('Pedido cancelado');
      await get().fetchOrders();
    } catch (error) {
      toast.error('No se pudo cancelar el pedido');
    }
  },

  /** Agrega una orden localmente (desde socket) */
  addOrderLocally: (newOrder: any) => {
    set((state: any) => {
      const exists = state.availableOrders.some((o: any) => o.id === newOrder.id);
      if (exists) return state;
      const resolved = resolveOrder(newOrder);
      return {
        ...state,
        availableOrders: [resolved, ...state.availableOrders],
        orders: [resolved, ...state.orders],
      };
    });
  },

  /** Elimina una orden localmente (desde socket) */
  removeOrderLocally: (orderId: string) => {
    set((state: any) => ({
      availableOrders: state.availableOrders.filter((o: any) => o.id !== orderId),
      orders: state.orders.filter((o: any) => o.id !== orderId),
    }));
  },

  /** Establece la orden pre-asignada (desde socket externo) */
  setPreAssignedOrder: (order: IAddOrder | null) => {
    set({
      preAssignedOrder: order,
      reservationExpiresAt: order?.reservation_expires_at ?? null,
    });
  },

  /** Limpia el estado de pre-asignación (expiración) */
  clearPreAssignment: () => {
    set({ preAssignedOrder: null, reservationExpiresAt: null });
  },
}));