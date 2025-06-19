-- CreateTable
CREATE TABLE "WidgetSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "buttonStyle" TEXT NOT NULL DEFAULT 'edge',
    "position" TEXT NOT NULL DEFAULT 'right',
    "color" TEXT NOT NULL DEFAULT '#00802F'
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "displayTime" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    CONSTRAINT "Contact_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "WidgetSettings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSettings_shop_key" ON "WidgetSettings"("shop");
