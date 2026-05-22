FROM node:20-alpine AS builder
WORKDIR /app

# Dependencias primero (cache layer)
COPY package*.json ./
RUN npm ci

# Código fuente
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generar Prisma client y luego compilar TypeScript
RUN npx prisma generate
RUN npm run build

# --- Imagen final (sin devDependencies ni fuentes .ts) ---
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar compilado y prisma desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

# Migrar y arrancar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]