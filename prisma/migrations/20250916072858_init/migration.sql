/*
  Warnings:

  - You are about to drop the column `topSKills` on the `industryInsight` table. All the data in the column will be lost.
  - You are about to drop the `coverLetter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_industry_fkey";

-- DropForeignKey
ALTER TABLE "public"."coverLetter" DROP CONSTRAINT "coverLetter_userId_fkey";

-- AlterTable
ALTER TABLE "public"."industryInsight" DROP COLUMN "topSKills",
ADD COLUMN     "recommendedSkills" TEXT[],
ADD COLUMN     "topSkills" TEXT[];

-- DropTable
DROP TABLE "public"."coverLetter";

-- CreateTable
CREATE TABLE "public"."CoverLetter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "jobDescription" TEXT,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalaryInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "entryLevelMin" INTEGER,
    "entryLevelMax" INTEGER,
    "midLevelMin" INTEGER,
    "midLevelMax" INTEGER,
    "seniorLevelMin" INTEGER,
    "seniorLevelMax" INTEGER,
    "userEstimate" INTEGER,
    "marketTrends" TEXT,
    "recommendations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoverLetter_userId_idx" ON "public"."CoverLetter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryInsight_userId_key" ON "public"."SalaryInsight"("userId");

-- CreateIndex
CREATE INDEX "SalaryInsight_userId_idx" ON "public"."SalaryInsight"("userId");

-- CreateIndex
CREATE INDEX "SalaryInsight_industry_idx" ON "public"."SalaryInsight"("industry");

-- AddForeignKey
ALTER TABLE "public"."CoverLetter" ADD CONSTRAINT "CoverLetter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryInsight" ADD CONSTRAINT "SalaryInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
