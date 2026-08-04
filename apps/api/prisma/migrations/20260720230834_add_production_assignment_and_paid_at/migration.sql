-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "assignedToId" UUID;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
