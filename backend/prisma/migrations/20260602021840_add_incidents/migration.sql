-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABIERTO',
    "reported_by_id" TEXT NOT NULL,
    "response" TEXT,
    "responded_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "incidents_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "incidents_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
