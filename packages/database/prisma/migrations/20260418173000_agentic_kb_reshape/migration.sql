-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_venueId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_poId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_stockItemId_fkey";

-- DropForeignKey
ALTER TABLE "SopDocument" DROP CONSTRAINT "SopDocument_venueId_fkey";

-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT "StockItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT "StockItem_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT "StockItem_venueId_fkey";

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "retrievedSopIds",
DROP COLUMN "retrievedStockIds",
ADD COLUMN     "retrievedItemIds" TEXT[],
ADD COLUMN     "toolCallLog" JSONB NOT NULL DEFAULT '[]';

-- DropTable
DROP TABLE "PurchaseOrder";

-- DropTable
DROP TABLE "PurchaseOrderItem";

-- DropTable
DROP TABLE "SopDocument";

-- DropTable
DROP TABLE "StockCategory";

-- DropTable
DROP TABLE "StockItem";

-- DropTable
DROP TABLE "Supplier";

-- CreateTable
CREATE TABLE "mock_suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_stock_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "mock_stock_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_stock" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "supplierId" TEXT,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT NOT NULL,
    "unitSize" TEXT,
    "currentQty" DECIMAL(65,30) NOT NULL,
    "parLevel" DECIMAL(65,30) NOT NULL,
    "reorderQty" DECIMAL(65,30) NOT NULL,
    "costPerUnit" DECIMAL(65,30),
    "avgWeeklyUsage" DECIMAL(65,30),
    "notes" TEXT,
    "embedding" vector(1024),
    "embeddingText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_purchase_orders" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "orderedAt" TIMESTAMP(3),
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_purchase_order_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qtyOrdered" DECIMAL(65,30) NOT NULL,
    "qtyReceived" DECIMAL(65,30),
    "unitCost" DECIMAL(65,30),

    CONSTRAINT "mock_purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" TEXT NOT NULL,
    "venueId" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1024),
    "embeddingText" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mock_stock_categories_name_key" ON "mock_stock_categories"("name");

-- CreateIndex
CREATE INDEX "mock_stock_venueId_idx" ON "mock_stock"("venueId");

-- CreateIndex
CREATE INDEX "mock_stock_categoryId_idx" ON "mock_stock"("categoryId");

-- CreateIndex
CREATE INDEX "knowledge_items_venueId_idx" ON "knowledge_items"("venueId");

-- AddForeignKey
ALTER TABLE "mock_stock" ADD CONSTRAINT "mock_stock_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_stock" ADD CONSTRAINT "mock_stock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "mock_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_stock" ADD CONSTRAINT "mock_stock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "mock_stock_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_purchase_orders" ADD CONSTRAINT "mock_purchase_orders_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_purchase_orders" ADD CONSTRAINT "mock_purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "mock_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_purchase_order_items" ADD CONSTRAINT "mock_purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "mock_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_purchase_order_items" ADD CONSTRAINT "mock_purchase_order_items_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "mock_stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
