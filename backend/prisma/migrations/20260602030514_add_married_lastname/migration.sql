/*
  Warnings:

  - You are about to drop the column `season` on the `time_slots` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "publishers" ADD COLUMN "married_last_name" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_time_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_time_slots" ("created_at", "end_time", "id", "name", "sort_order", "start_time") SELECT "created_at", "end_time", "id", "name", "sort_order", "start_time" FROM "time_slots";
DROP TABLE "time_slots";
ALTER TABLE "new_time_slots" RENAME TO "time_slots";
CREATE UNIQUE INDEX "time_slots_name_key" ON "time_slots"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
