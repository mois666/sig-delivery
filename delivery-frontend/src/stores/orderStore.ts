import { create } from 'zustand';
import { IOrder, OrderStatus, IAddOrder } from '@/interfaces/orders-interface';
import { appDB } from '@/api/appDB';
import axios from 'axios';
import { toast } from 'sonner';

interface OrderState {
  orders: [];
  availableOrders: IAddOrder[];
  activeOrder: IOrder | null;
  completedOrders: IOrder[];
  isLoading: boolean;

  // Acciones
  fetchOrders: () => Promise<void>;
  addOrder: (order: IAddOrder) => Promise<boolean>;
  acceptOrder: (orderId: string, driverId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  addOrderLocally: (newOrder: any) => void;
  removeOrderLocally: (orderId: string) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  availableOrders: [],
  activeOrder: null,
  completedOrders: [],
  isLoading: false,

  /**
   * Carga las órdenes desde el backend
   */
  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const { data } = await appDB.get("/orders");
      // Filtramos por estado según la lógica de negocio
      //const filteredOrders = data.orders.filter(order => order.status === OrderStatus.PENDIENTE);
      set({
        orders: data.orders,
        availableOrders: data.orders,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || "Error al sincronizar pedidos");
      }
    }
  },

  /**
   * Envía el nuevo reto/carrera al backend (Laravel)
   */
  addOrder: async (orderData: IAddOrder) => {
    try {
      const { data } = await appDB.post<IAddOrder>('/orders', orderData);
      set((state) => ({
        availableOrders: [data, ...state.availableOrders],
      }));
      await get().fetchOrders();
      toast.success("¡Carrera publicada!");
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data.message || "Error al crear pedido");
      }
      return false;
    }
  },

  /**
   * Acepta una orden (Lógica de Driver)
   */
  acceptOrder: async (orderId: string, driverId: string) => {
    try {
      const { data } = await appDB.put<IOrder>(`/orders/${orderId}/accept`, { driver_id: driverId });
      set((state) => ({
        availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
        activeOrder: data,
      }));
      toast.success("Pedido aceptado");
    } catch (error) {
      toast.error("No se pudo aceptar el pedido");
    }
  },

  /**
   * Actualiza el estado (En camino, En el punto, etc)
   */
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    try {
      const { data } = await appDB.patch<IOrder>(`/orders/${orderId}/status`, { status });
      set((state) => ({
        activeOrder: state.activeOrder?.id === orderId ? data : state.activeOrder,
      }));
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  },

  /**
   * Finaliza la entrega
   */
  completeOrder: async (orderId: string) => {
    try {
      const { data } = await appDB.patch<IOrder>(`/orders/${orderId}/complete`);
      set((state) => ({
        activeOrder: null,
        completedOrders: [data, ...state.completedOrders],
      }));
      toast.success("¡Entrega completada!");
    } catch (error) {
      toast.error("Error al finalizar pedido");
    }
  },

  /**
   * Elimina/Cancela una orden (Lógica de Admin)
   */
  removeOrder: async (orderId: string) => {
    try {
      await appDB.delete(`/orders/${orderId}`);
      set((state) => ({
        availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
      }));
      toast.success("Pedido cancelado");
      await get().fetchOrders();
    } catch (error) {
      toast.error("No se pudo cancelar el pedido");
    }
  },
  addOrderLocally: (newOrder: any) => {
    set((state: any) => {
      // Verificar si la orden ya existe para evitar duplicados por re-conexiones
      const exists = state.availableOrders.some((o: any) => o.id === newOrder.id);
      if (exists) return state;

      return {
        ...state,
        availableOrders: [newOrder, ...state.availableOrders],
        // También actualizamos la lista general si es necesario
        orders: [newOrder, ...state.orders]
      };
    });
  },
  removeOrderLocally: (orderId: string) => {
    set((state: any) => ({
      availableOrders: state.availableOrders.filter((o: any) => o.id !== orderId),
      // También actualizamos la lista general si la usas
      orders: state.orders.filter((o: any) => o.id !== orderId)
    }));
  },
}));