-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "productKeyword" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "rating" REAL,
    "domain" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "validContact" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FitScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "categoryMatch" BOOLEAN NOT NULL,
    "hasWebsite" BOOLEAN NOT NULL,
    "hasPhone" BOOLEAN NOT NULL,
    "similarity" REAL NOT NULL,
    "signals" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FitScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Company_searchId_idx" ON "Company"("searchId");

-- CreateIndex
CREATE INDEX "Company_placeId_idx" ON "Company"("placeId");

-- CreateIndex
CREATE INDEX "Company_domain_idx" ON "Company"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "FitScore_companyId_key" ON "FitScore"("companyId");
