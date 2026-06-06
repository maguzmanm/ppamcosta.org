-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_time_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "season" TEXT NOT NULL DEFAULT 'VERANO',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_time_slots" ("created_at", "end_time", "id", "name", "sort_order", "start_time") SELECT "created_at", "end_time", "id", "name", "sort_order", "start_time" FROM "time_slots";
DROP TABLE "time_slots";
ALTER TABLE "new_time_slots" RENAME TO "time_slots";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
