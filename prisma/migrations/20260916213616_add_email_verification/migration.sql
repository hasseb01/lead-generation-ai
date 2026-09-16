-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "syntaxValid" BOOLEAN NOT NULL,
    "mxFound" BOOLEAN NOT NULL,
    "smtpDeliverable" BOOLEAN,
    "isDisposable" BOOLEAN NOT NULL,
    "isRoleAccount" BOOLEAN NOT NULL,
    "isCatchAll" BOOLEAN,
    "guessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailVerification_companyId_idx" ON "EmailVerification"("companyId");

-- CreateIndex
CREATE INDEX "EmailVerification_email_idx" ON "EmailVerification"("email");
