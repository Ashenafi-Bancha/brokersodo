-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('PENDING', 'ACTIVE', 'HIDDEN', 'REJECTED');

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'UNDER_NEGOTIATION';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "videoFile" TEXT;

-- AlterTable
ALTER TABLE "PropertySubmission" ADD COLUMN     "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoFile" TEXT;

-- AlterTable
ALTER TABLE "WantedRequest" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WantedResponse" (
    "id" TEXT NOT NULL,
    "wantedId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WantedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL,
    "telegram" TEXT,
    "whatsapp" TEXT,
    "areaId" TEXT,
    "address" TEXT,
    "openingHours" TEXT,
    "logo" JSONB,
    "cover" JSONB,
    "status" "StoreStatus" NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "rejectReason" TEXT,
    "staffNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "priceNote" TEXT,
    "image" JSONB,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WantedResponse_wantedId_idx" ON "WantedResponse"("wantedId");

-- CreateIndex
CREATE INDEX "WantedResponse_status_createdAt_idx" ON "WantedResponse"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Store_refCode_key" ON "Store"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Store_memberId_key" ON "Store"("memberId");

-- CreateIndex
CREATE INDEX "Store_status_featured_publishedAt_idx" ON "Store"("status", "featured", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Store_type_status_idx" ON "Store"("type", "status");

-- CreateIndex
CREATE INDEX "Store_areaId_status_idx" ON "Store"("areaId", "status");

-- CreateIndex
CREATE INDEX "StoreItem_storeId_sortOrder_idx" ON "StoreItem"("storeId", "sortOrder");

-- CreateIndex
CREATE INDEX "WantedRequest_isPublic_status_createdAt_idx" ON "WantedRequest"("isPublic", "status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "WantedResponse" ADD CONSTRAINT "WantedResponse_wantedId_fkey" FOREIGN KEY ("wantedId") REFERENCES "WantedRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

