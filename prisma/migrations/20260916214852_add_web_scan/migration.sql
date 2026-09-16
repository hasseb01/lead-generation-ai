-- CreateTable
CREATE TABLE "WebScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fetchOk" BOOLEAN NOT NULL,
    "error" TEXT,
    "techStack" TEXT,
    "topics" TEXT,
    "summary" TEXT,
    "contentHash" TEXT,
    "changedSincePrev" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebScan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WebScan_companyId_idx" ON "WebScan"("companyId");
