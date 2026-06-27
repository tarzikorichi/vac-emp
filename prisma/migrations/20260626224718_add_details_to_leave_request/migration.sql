-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LeaveRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "daysTaken" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL,
    "substitute" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LeaveRequest" ("createdAt", "daysTaken", "employeeId", "endDate", "id", "leaveType", "startDate") SELECT "createdAt", "daysTaken", "employeeId", "endDate", "id", "leaveType", "startDate" FROM "LeaveRequest";
DROP TABLE "LeaveRequest";
ALTER TABLE "new_LeaveRequest" RENAME TO "LeaveRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
