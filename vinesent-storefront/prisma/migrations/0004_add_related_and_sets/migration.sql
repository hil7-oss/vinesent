-- CreateTable
CREATE TABLE IF NOT EXISTS "_RelatedProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RelatedProducts_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_ProductSets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductSets_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_RelatedProducts_B_index" ON "_RelatedProducts"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_ProductSets_B_index" ON "_ProductSets"("B");

-- AddForeignKey
ALTER TABLE "_RelatedProducts" DROP CONSTRAINT IF EXISTS "_RelatedProducts_A_fkey";
ALTER TABLE "_RelatedProducts" ADD CONSTRAINT "_RelatedProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedProducts" DROP CONSTRAINT IF EXISTS "_RelatedProducts_B_fkey";
ALTER TABLE "_RelatedProducts" ADD CONSTRAINT "_RelatedProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductSets" DROP CONSTRAINT IF EXISTS "_ProductSets_A_fkey";
ALTER TABLE "_ProductSets" ADD CONSTRAINT "_ProductSets_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductSets" DROP CONSTRAINT IF EXISTS "_ProductSets_B_fkey";
ALTER TABLE "_ProductSets" ADD CONSTRAINT "_ProductSets_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
