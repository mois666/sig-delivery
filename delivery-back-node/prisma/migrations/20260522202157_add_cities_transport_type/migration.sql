/*
  Warnings:

  - You are about to drop the column `city` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('on_foot', 'bike', 'motorcycle', 'car');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'client';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "city_id" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "city",
ADD COLUMN     "city_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "transport_type" "TransportType" NOT NULL DEFAULT 'motorcycle';

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Bolivia',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BOB',
    "coordinates" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
