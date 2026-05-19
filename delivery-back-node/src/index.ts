import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import routes from './routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io con CORS
const io = new Server(server, {
  cors: {
    origin: "*", // En producción, usa la URL de tu frontend
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"], // Permite Vite y puertos comunes
  credentials: true, // Necesario para recibir cookies
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

      const result = await prisma.$transaction(async (tx: any) => {
        const order = await tx.order.findUnique({ where: { id: order_id } });
        
        if (!order || order.status !== 'pending') {
          throw new Error('El pedido ya no está disponible');
        }

        const updatedOrder = await tx.order.update({
          where: { id: order_id },
          data: { status: 'assigned' }
        });

        await tx.orderAssignment.create({
          data: {
            order_id,
            user_id,
            status: 'accepted'
          }
        });

        return updatedOrder;
      });

      console.log(`Pedido ${order_id} aceptado por driver ${user_id}`);
      io.emit('order_assigned', result);
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
server.listen(PORT, () => {
  console.log(`Servidor de Delivery corriendo en puerto ${PORT}`);
});
