# 🚚 Proyecto Delivery - Guía de Instalación y Ejecución Local

Esta guía contiene los pasos detallados para configurar y ejecutar tanto el **Backend** (Node.js + Prisma) como el **Frontend** (Vite + React) en tu entorno local.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu máquina:

- [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
- [npm](https://www.npmjs.com/) (incluido con Node.js) o [Bun](https://bun.sh/) (opcional, soportado en el frontend)
- [Docker](https://www.docker.com/) y **Docker Compose** (necesarios para levantar las bases de datos de MySQL y Redis de forma sencilla)
- [Git](https://git-scm.com/) (para control de versiones)

---

## 📂 Estructura del Proyecto

El proyecto está dividido en dos directorios principales:

1. **`delivery-back-node/`**: Servidor API construido con Node.js, Express, Socket.io y Prisma ORM.
2. **`delivery-frontend/`**: Aplicación de interfaz de usuario construida con React, Vite, Tailwind CSS v4, Lucide React y Leaflet para mapas.

---

## 1. ⚙️ Configuración del Backend (`delivery-back-node`)

El backend requiere una base de datos MySQL y una instancia de Redis. La forma más sencilla de levantarlos es utilizando Docker.

### Pasos para la instalación:

1. **Navega al directorio del backend:**
   ```bash
   cd delivery-back-node
   ```

2. **Crear archivo de configuración de entorno:**
   Copia el archivo de plantilla `.env.example` a un nuevo archivo `.env` (si aún no existe):
   ```bash
   cp .env.example .env
   ```
   *Nota: En Windows (PowerShell), puedes usar:*
   ```powershell
   Copy-Item .env.example .env
   ```

3. **Levantar contenedores de Base de Datos (MySQL y Redis):**
   Asegúrate de tener Docker abierto y ejecuta:
   ```bash
   docker-compose up -d
   ```
   Esto creará y levantará dos servicios en segundo plano:
   - **MySQL** en el puerto `3307`
   - **Redis** en el puerto `6379`

4. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

5. **Sincronizar y generar la Base de Datos:**
   Sincroniza el esquema de Prisma con MySQL y genera el cliente de Prisma ejecutando:
   ```bash
   # Sincronizar esquema de base de datos
   npx prisma db push

   # Generar cliente de Prisma
   npx prisma generate
   ```
   *(Nota: Usamos `db push` para evitar problemas de permisos con la base de datos temporal de Docker durante el desarrollo local)*

6. **Cargar datos iniciales (Seed):**
   Para tener datos de prueba (usuarios, productos, roles, etc.) en la base de datos, ejecuta el script de seed:
   ```bash
   npx ts-node prisma/seed.ts
   ```

7. **Iniciar el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```
   El backend se ejecutará en **`http://localhost:4000`**.
   - **Health Check Endpoint:** `http://localhost:4000/health`
   - **WebSocket (Socket.io):** `http://localhost:4000`

---

### 🐳 Comandos Útiles de Docker para el Backend

Si necesitas administrar los contenedores de base de datos, usa estos comandos dentro de la carpeta `delivery-back-node`:

- **Ver logs de los contenedores:**
  ```bash
  docker-compose logs -f
  ```
- **Detener los contenedores (sin borrar datos):**
  ```bash
  docker-compose stop
  ```
- **Apagar y eliminar contenedores (¡Atención: esto borrarra los datos persistidos en el volumen!):**
  ```bash
  docker-compose down -v
  ```

### 🗄️ Credenciales por Defecto de la Base de Datos

Si quieres conectarte a la base de datos local usando un gestor externo (como DBeaver, TablePlus, VS Code MySQL, etc.):
- **Host:** `localhost`
- **Puerto:** `3307`
- **Usuario:** `admin` (o `root` con contraseña `root`)
- **Contraseña:** `admin123`
- **Nombre de la base de datos:** `delivery_app`

---

## 2. 🎨 Configuración del Frontend (`delivery-frontend`)

El frontend está desarrollado con Vite y React y se comunica directamente con el backend mediante peticiones HTTP y WebSockets.

### Pasos para la instalación:

1. **Navega al directorio del frontend:**
   ```bash
   cd ../delivery-frontend
   # o desde la raíz: cd delivery-frontend
   ```

2. **Crear archivo de configuración de entorno:**
   Copia el archivo de plantilla `.env,example` o verifica que tengas tu `.env` listo:
   ```bash
   cp .env,example .env
   ```
   *(Nota: En Windows PowerShell, usa: `Copy-Item .env,example .env`)*

   Asegúrate de que tu archivo `.env` tenga las variables configuradas de la siguiente manera para apuntar al backend local:
   ```env
   VITE_API_URL=http://localhost:4000/api
   VITE_SOCKET_URL=http://localhost:4000
   VITE_API_KEY_GEOCODING=b07354c00c4e4ebca58287e315d1afeb
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyDD6YYOAFypgXEmn6qyCdx_ua5k58ZRUkI
   ```

3. **Instalar dependencias del proyecto:**
   Puedes usar `npm` o `bun` (ya que cuenta con lockfiles para ambos):
   
   **Usando npm:**
   ```bash
   npm install
   ```
   
   **Usando Bun (opcional):**
   ```bash
   bun install
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   # Con npm
   npm run dev

   # Con Bun
   bun run dev
   ```
   El frontend se levantará normalmente en **`http://localhost:5173`** (o en el puerto libre que te indique la consola).

---

## 🚀 Resumen de Flujo de Trabajo en Desarrollo

Para trabajar en el proyecto a diario, te recomendamos seguir este flujo:

1. Abre tu terminal o aplicación de Docker Desktop y asegúrate de que el servicio Docker esté activo.
2. Abre dos terminales independientes en tu editor (o dos pestañas):
   - **Terminal 1 (Backend):**
     ```bash
     cd delivery-back-node
     docker-compose up -d  # Asegura que MySQL y Redis estén corriendo
     npm run dev
     ```
   - **Terminal 2 (Frontend):**
     ```bash
     cd delivery-frontend
     npm run dev
     ```
3. Abre tu navegador en **`http://localhost:5173`**. ¡Listo! Ya puedes ver tu aplicación interactuando en tiempo real con sockets al backend en el puerto `4000`.
