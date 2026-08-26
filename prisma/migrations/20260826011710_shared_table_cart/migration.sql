-- CreateTable
CREATE TABLE "cart_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "choiceIds" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_lines_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cart_lines_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cart_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "menu_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "cart_lines_venueId_tableId_idx" ON "cart_lines"("venueId", "tableId");
