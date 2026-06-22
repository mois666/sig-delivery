import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import routes from './routes';

dotenv.config();

// Configurar la zona horaria global de la aplicación
process.env.TZ = process.env.APP_TIMEZONE || 'America/La_Paz';

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io con CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Middleware para pasar prisma e io a las rutas
app.use((req, res, next) => {
  (req as any).io = io;
  (req as any).prisma = prisma;
  next();
});

// Rutas de la API
app.use('/api', routes);

// Rutas de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor de Delivery corriendo' });
});

// --- LÓGICA DE SOCKETS ---
// Mantenemos la lógica de sockets para eventos directos si es necesario
io.on('connection', (socket) => {
  console.log('Nuevo dispositivo conectado:', socket.id);

  // Ejemplo: Un repartidor acepta el pedido directamente vía Socket
  socket.on('accept_order', async (data) => {
    try {
      const { order_id, user_id } = data;

      await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.findUnique({ where: { id: order_id } });

        if (!order || !['pending', 'active', 'pre-assigned'].includes(order.status)) {
          throw new Error('El pedido ya no está disponible');
        }

        await tx.order.update({
          where: { id: order_id },
          data: { status: 'assigned' }
        });

        await tx.orderAssignment.create({
          data: {
            order_id,
            user_id,
            status: 'collected',
            status_metadata: {
              collected_at: new Date(),
              running_at: null,
              arrived_at: null,
              delivered_at: null,
              'not-delivered_at': null
            }
          }
        });
      });

      // Fetch the updated order including its assignments to emit
      const finalOrder = await prisma.order.findUnique({
        where: { id: order_id },
        include: {
          assignments: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      });

      console.log(`Pedido ${order_id} aceptado por driver ${user_id}`);
      io.emit('order_assigned', finalOrder);
      socket.emit('order_accepted_confirm', { success: true });

    } catch (error: any) {
      console.error("Error al aceptar pedido:", error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

const PORT = process.env.PORT || 4000;

// ─── Cron: Expirar reservas pre-assigned cada 30 segundos ─────────────────────
setInterval(async () => {
  try {
    const expired = await prisma.order.findMany({
      where: {
        status: 'pre-assigned',
        reservation_expires_at: { lt: new Date() },
      },
    });

    for (const order of expired) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'active',
          reserved_driver_id: null,
          reserved_at: null,
          reservation_expires_at: null,
        },
      });
      io.emit('order_reservation_expired', { order_id: order.id });
      io.emit('order_activated', { ...order, status: 'active' });
      console.log(`[Cron] Reserva expirada para order #${order.id}`);
    }
  } catch (err) {
    console.error('[Cron] Error al expirar reservas:', err);
  }
}, 30_000);

server.listen(PORT, () => {
  console.log(`Servidor de Delivery corriendo en puerto ${PORT}`);
});
