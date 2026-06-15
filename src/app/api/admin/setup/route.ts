import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { addDays, addMonths, setDate, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ----------------------------------------------------------------------------
// One-time production setup endpoint.
//
// Creates the full schema (matching prisma/schema.prisma) via raw SQL and
// seeds demo data. Safe to call multiple times:
// - All CREATE TABLE/INDEX statements use IF NOT EXISTS.
// - Demo data is skipped if the demo user already has transactions.
//
// Visit GET /api/admin/setup once after deploying to a fresh database.
// ----------------------------------------------------------------------------

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "supabaseId" TEXT UNIQUE,
    "email" TEXT UNIQUE NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "role" TEXT NOT NULL DEFAULT 'user',
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email")`,

  `CREATE TABLE IF NOT EXISTS "FamilyGroup" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "Wallet" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'personal',
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyGroupId" TEXT REFERENCES "FamilyGroup"("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId")`,

  `CREATE TABLE IF NOT EXISTS "WalletMember" (
    "id" TEXT PRIMARY KEY,
    "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("walletId", "userId")
  )`,
  `CREATE INDEX IF NOT EXISTS "WalletMember_userId_idx" ON "WalletMember"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "nameTh" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'circle',
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "type" TEXT NOT NULL DEFAULT 'expense',
    "parentId" TEXT REFERENCES "Category"("id"),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Category_userId_idx" ON "Category"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94a3b8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "name")
  )`,

  `CREATE TABLE IF NOT EXISTS "RecurringTransaction" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
    "categoryId" TEXT REFERENCES "Category"("id"),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "autoCreate" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDetected" BOOLEAN NOT NULL DEFAULT false,
    "merchant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "walletId" TEXT NOT NULL REFERENCES "Wallet"("id") ON DELETE CASCADE,
    "categoryId" TEXT REFERENCES "Category"("id"),
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "merchant" TEXT,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recurringId" TEXT REFERENCES "RecurringTransaction"("id"),
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "Transaction_walletId_idx" ON "Transaction"("walletId")`,
  `CREATE INDEX IF NOT EXISTS "Transaction_categoryId_idx" ON "Transaction"("categoryId")`,

  `CREATE TABLE IF NOT EXISTS "TransactionTag" (
    "transactionId" TEXT NOT NULL REFERENCES "Transaction"("id") ON DELETE CASCADE,
    "tagId" TEXT NOT NULL REFERENCES "Tag"("id") ON DELETE CASCADE,
    PRIMARY KEY ("transactionId", "tagId")
  )`,

  `CREATE TABLE IF NOT EXISTS "Receipt" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "transactionId" TEXT UNIQUE REFERENCES "Transaction"("id") ON DELETE SET NULL,
    "imageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ocrMerchant" TEXT,
    "ocrAmount" DOUBLE PRECISION,
    "ocrDate" TIMESTAMP(3),
    "ocrCategory" TEXT,
    "ocrRawText" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Receipt_userId_idx" ON "Receipt"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "walletId" TEXT REFERENCES "Wallet"("id"),
    "categoryId" TEXT REFERENCES "Category"("id"),
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "rollover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "Budget"("userId")`,

  `CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'target',
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "monthlyContribution" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId")`,

  `CREATE TABLE IF NOT EXISTS "GoalContribution" (
    "id" TEXT PRIMARY KEY,
    "goalId" TEXT NOT NULL REFERENCES "Goal"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "GoalContribution_goalId_idx" ON "GoalContribution"("goalId")`,

  `CREATE TABLE IF NOT EXISTS "FinancialHealthScore" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "score" INTEGER NOT NULL,
    "savingsRateScore" INTEGER NOT NULL,
    "debtRatioScore" INTEGER NOT NULL,
    "emergencyFundScore" INTEGER NOT NULL,
    "budgetAdherenceScore" INTEGER NOT NULL,
    "spendingConsistencyScore" INTEGER NOT NULL,
    "breakdown" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "FinancialHealthScore_userId_computedAt_idx" ON "FinancialHealthScore"("userId", "computedAt")`,

  `CREATE TABLE IF NOT EXISTS "Insight" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Insight_userId_type_createdAt_idx" ON "Insight"("userId", "type", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "CashflowForecast" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "forMonth" TIMESTAMP(3) NOT NULL,
    "predictedIncome" DOUBLE PRECISION NOT NULL,
    "predictedExpense" DOUBLE PRECISION NOT NULL,
    "predictedBalance" DOUBLE PRECISION NOT NULL,
    "scenario" TEXT NOT NULL DEFAULT 'baseline',
    "assumptions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "CashflowForecast_userId_forMonth_idx" ON "CashflowForecast"("userId", "forMonth")`,

  `CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "walletId" TEXT REFERENCES "Wallet"("id"),
    "recurringId" TEXT REFERENCES "RecurringTransaction"("id"),
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notifyDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_dueDate_idx" ON "CalendarEvent"("userId", "dueDate")`,

  `CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "SalaryAllocationPlan" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "salaryAmount" DOUBLE PRECISION NOT NULL,
    "savingsPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "investmentPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "billsPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "spendingPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "SalaryAllocationPlan_userId_idx" ON "SalaryAllocationPlan"("userId")`,

  `CREATE TABLE IF NOT EXISTS "EmergencyPlan" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashRunwayDays" INTEGER NOT NULL,
    "survivalBudget" TEXT NOT NULL,
    "reductionPlan" TEXT NOT NULL,
    "priorityPayments" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3)
  )`,
  `CREATE INDEX IF NOT EXISTS "EmergencyPlan_userId_idx" ON "EmergencyPlan"("userId")`,

  `CREATE TABLE IF NOT EXISTS "MonthlyWrapped" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "month" TIMESTAMP(3) NOT NULL,
    "totalIncome" DOUBLE PRECISION NOT NULL,
    "totalExpense" DOUBLE PRECISION NOT NULL,
    "netSavings" DOUBLE PRECISION NOT NULL,
    "topCategory" TEXT,
    "topMerchant" TEXT,
    "biggestExpense" DOUBLE PRECISION,
    "savingsAchievement" TEXT,
    "score" INTEGER NOT NULL,
    "shareSlug" TEXT UNIQUE,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "month")
  )`,

  `CREATE TABLE IF NOT EXISTS "FamilyMember" (
    "id" TEXT PRIMARY KEY,
    "familyGroupId" TEXT NOT NULL REFERENCES "FamilyGroup"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("familyGroupId", "userId")
  )`,

  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead")`,

  `CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT UNIQUE NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPct" INTEGER NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", nameTh: "อาหารและเครื่องดื่ม", icon: "food", color: "#f97316" },
  { name: "Groceries", nameTh: "ของใช้ในบ้าน", icon: "shopping-cart", color: "#22c55e" },
  { name: "Transport", nameTh: "การเดินทาง", icon: "car", color: "#3b82f6" },
  { name: "Housing", nameTh: "ที่อยู่อาศัย", icon: "home", color: "#8b5cf6" },
  { name: "Bills & Utilities", nameTh: "ค่าน้ำค่าไฟ", icon: "wifi", color: "#06b6d4" },
  { name: "Shopping", nameTh: "ช็อปปิ้ง", icon: "shopping-bag", color: "#ec4899" },
  { name: "Entertainment", nameTh: "ความบันเทิง", icon: "film", color: "#a855f7" },
  { name: "Health & Fitness", nameTh: "สุขภาพและฟิตเนส", icon: "heart-pulse", color: "#ef4444" },
  { name: "Education", nameTh: "การศึกษา", icon: "graduation-cap", color: "#14b8a6" },
  { name: "Travel", nameTh: "ท่องเที่ยว", icon: "plane", color: "#0ea5e9" },
  { name: "Subscriptions", nameTh: "ค่าสมาชิก", icon: "credit-card", color: "#6366f1" },
  { name: "Personal Care", nameTh: "ดูแลตัวเอง", icon: "coffee", color: "#f59e0b" },
  { name: "Gifts & Donations", nameTh: "ของขวัญและบริจาค", icon: "gift", color: "#f43f5e" },
  { name: "Other", nameTh: "อื่นๆ", icon: "circle", color: "#64748b" },
] as const;

const INCOME_CATEGORIES = [
  { name: "Salary", nameTh: "เงินเดือน", icon: "salary", color: "#22c55e" },
  { name: "Freelance", nameTh: "งานฟรีแลนซ์", icon: "trending-up", color: "#10b981" },
  { name: "Investment", nameTh: "เงินลงทุน", icon: "trending-up", color: "#06b6d4" },
  { name: "Gift", nameTh: "เงินรับของขวัญ", icon: "gift", color: "#f43f5e" },
  { name: "Other Income", nameTh: "รายรับอื่นๆ", icon: "cash", color: "#64748b" },
] as const;

function rand(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export async function GET() {
  const log: string[] = [];
  try {
    // 1. Schema --------------------------------------------------------
    for (const stmt of DDL) {
      await prisma.$executeRawUnsafe(stmt);
    }
    log.push("Schema ready.");

    // 2. System categories ---------------------------------------------
    let categories = await prisma.category.findMany({ where: { isSystem: true } });
    if (categories.length === 0) {
      await prisma.category.createMany({
        data: [
          ...EXPENSE_CATEGORIES.map((c) => ({ ...c, type: "expense", isSystem: true })),
          ...INCOME_CATEGORIES.map((c) => ({ ...c, type: "income", isSystem: true })),
        ],
      });
      categories = await prisma.category.findMany({ where: { isSystem: true } });
      log.push(`Seeded ${categories.length} system categories.`);
    } else {
      log.push("System categories already exist.");
    }
    const cat = (name: string) => {
      const found = categories.find((c) => c.name === name);
      if (!found) throw new Error(`Category not found: ${name}`);
      return found;
    };

    // 3. Demo user --------------------------------------------------------
    const user = await prisma.user.upsert({
      where: { email: "demo@moneyflow.ai" },
      update: { role: "admin" },
      create: {
        email: "demo@moneyflow.ai",
        name: "Demo User",
        locale: "en",
        currency: "THB",
        timezone: "Asia/Bangkok",
        theme: "system",
        role: "admin",
        onboarded: true,
      },
    });
    log.push(`Demo user: ${user.email} (${user.id})`);

    // 4. Wallets ------------------------------------------------------------
    let mainWallet = await prisma.wallet.findFirst({ where: { userId: user.id, isDefault: true } });
    if (!mainWallet) {
      mainWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          name: "Main Wallet",
          type: "personal",
          currency: "THB",
          icon: "wallet",
          color: "#6366f1",
          balance: 42500,
          isDefault: true,
        },
      });
    }
    let savingsWallet = await prisma.wallet.findFirst({ where: { userId: user.id, name: "Savings" } });
    if (!savingsWallet) {
      savingsWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          name: "Savings",
          type: "personal",
          currency: "THB",
          icon: "piggy-bank",
          color: "#22c55e",
          balance: 145000,
        },
      });
    }
    log.push("Wallets ready.");

    // 5. Subscription ---------------------------------------------------
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        plan: "pro",
        status: "active",
        currentPeriodStart: startOfMonth(new Date()),
        currentPeriodEnd: addMonths(startOfMonth(new Date()), 1),
      },
    });
    log.push("Subscription ready.");

    // 6. Bulk demo data (skip if already present) ------------------------
    const txnCount = await prisma.transaction.count({ where: { userId: user.id } });
    if (txnCount > 0) {
      log.push("Demo transactions already exist, skipping bulk demo data.");
      return NextResponse.json({ ok: true, log });
    }

    // Tags
    const tagDefs = [
      { name: "essential", color: "#22c55e" },
      { name: "work", color: "#6366f1" },
      { name: "fun", color: "#ec4899" },
      { name: "subscription", color: "#a855f7" },
    ];
    const tagIds: Record<string, string> = {};
    for (const t of tagDefs) tagIds[t.name] = randomUUID();
    await prisma.tag.createMany({
      data: tagDefs.map((t) => ({ id: tagIds[t.name], userId: user.id, name: t.name, color: t.color })),
    });
    log.push("Tags ready.");

    // Transactions (last 3 months)
    const monthlyExpenseTemplates: Array<{
      category: string;
      merchant: string;
      min: number;
      max: number;
      days: number[];
      tag?: string;
    }> = [
      { category: "Housing", merchant: "Lumpini Condo", min: 15000, max: 15000, days: [2], tag: "essential" },
      { category: "Bills & Utilities", merchant: "MEA Electric", min: 1200, max: 2400, days: [5] },
      { category: "Bills & Utilities", merchant: "True Internet", min: 590, max: 590, days: [6], tag: "subscription" },
      { category: "Subscriptions", merchant: "Netflix", min: 419, max: 419, days: [8], tag: "subscription" },
      { category: "Subscriptions", merchant: "Spotify", min: 149, max: 149, days: [9], tag: "subscription" },
      { category: "Groceries", merchant: "Tesco Lotus", min: 600, max: 1800, days: [3, 11, 19, 27] },
      { category: "Food & Dining", merchant: "Starbucks", min: 95, max: 180, days: [1, 7, 14, 21, 28], tag: "fun" },
      { category: "Food & Dining", merchant: "Local Restaurant", min: 150, max: 450, days: [2, 6, 10, 13, 17, 20, 24, 27] },
      { category: "Transport", merchant: "BTS Skytrain", min: 40, max: 60, days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26], tag: "essential" },
      { category: "Transport", merchant: "Grab", min: 80, max: 250, days: [7, 15, 23] },
      { category: "Shopping", merchant: "Central Department Store", min: 500, max: 3200, days: [12, 25], tag: "fun" },
      { category: "Entertainment", merchant: "Major Cineplex", min: 180, max: 360, days: [16], tag: "fun" },
      { category: "Health & Fitness", merchant: "Fitness First", min: 1500, max: 1500, days: [4], tag: "subscription" },
      { category: "Personal Care", merchant: "Pharmacy", min: 150, max: 600, days: [18] },
    ];

    const today = new Date();
    const txnRows: Array<Record<string, unknown>> = [];
    const tagJoinRows: { transactionId: string; tagId: string }[] = [];

    for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
      const monthStart = startOfMonth(subMonths(today, monthsAgo));

      const salaryId = randomUUID();
      txnRows.push({
        id: salaryId,
        userId: user.id,
        walletId: mainWallet.id,
        categoryId: cat("Salary").id,
        type: "income",
        amount: 55000,
        currency: "THB",
        date: setDate(monthStart, 1),
        merchant: "Acme Corp",
        note: "Monthly salary",
        source: "manual",
      });
      tagJoinRows.push({ transactionId: salaryId, tagId: tagIds.work });

      if (monthsAgo === 1) {
        const freelanceId = randomUUID();
        txnRows.push({
          id: freelanceId,
          userId: user.id,
          walletId: mainWallet.id,
          categoryId: cat("Freelance").id,
          type: "income",
          amount: 8500,
          currency: "THB",
          date: setDate(monthStart, 18),
          merchant: "Design Client",
          note: "Logo design project",
          source: "manual",
        });
        tagJoinRows.push({ transactionId: freelanceId, tagId: tagIds.work });
      }

      for (const tpl of monthlyExpenseTemplates) {
        for (const day of tpl.days) {
          if (day > 28) continue;
          const date = setDate(monthStart, day);
          if (date > today) continue;

          const id = randomUUID();
          txnRows.push({
            id,
            userId: user.id,
            walletId: mainWallet.id,
            categoryId: cat(tpl.category).id,
            type: "expense",
            amount: rand(tpl.min, tpl.max),
            currency: "THB",
            date,
            merchant: tpl.merchant,
            source: "manual",
          });
          if (tpl.tag) tagJoinRows.push({ transactionId: id, tagId: tagIds[tpl.tag] });
        }
      }
    }

    await prisma.transaction.createMany({ data: txnRows as never });
    if (tagJoinRows.length) await prisma.transactionTag.createMany({ data: tagJoinRows });
    log.push(`Created ${txnRows.length} transactions.`);

    // Budgets
    await prisma.budget.createMany({
      data: [
        { userId: user.id, name: "Overall monthly budget", amount: 40000, period: "monthly", categoryId: null, alertThreshold: 0.9 },
        { userId: user.id, name: "Food & Dining", amount: 8000, period: "monthly", categoryId: cat("Food & Dining").id, alertThreshold: 0.8 },
        { userId: user.id, name: "Shopping", amount: 5000, period: "monthly", categoryId: cat("Shopping").id, alertThreshold: 0.8 },
        { userId: user.id, name: "Entertainment", amount: 2000, period: "monthly", categoryId: cat("Entertainment").id, alertThreshold: 0.8 },
      ],
    });
    log.push("Budgets ready.");

    // Goals
    const emergencyGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        name: "Emergency Fund",
        type: "emergency_fund",
        icon: "shield",
        targetAmount: 150000,
        currentAmount: 90000,
        targetDate: addMonths(today, 8),
        priority: "high",
        status: "active",
        monthlyContribution: 7500,
        notes: "Aim for 3 months of essential expenses.",
      },
    });

    const tripGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        name: "Japan Trip",
        type: "travel",
        icon: "plane",
        targetAmount: 80000,
        currentAmount: 22000,
        targetDate: addMonths(today, 10),
        priority: "medium",
        status: "active",
        monthlyContribution: 6000,
        notes: "Spring trip with friends.",
      },
    });

    await prisma.goal.create({
      data: {
        userId: user.id,
        name: "New Laptop",
        type: "custom",
        icon: "target",
        targetAmount: 45000,
        currentAmount: 45000,
        targetDate: subMonths(today, 1),
        priority: "low",
        status: "completed",
        notes: "Upgraded for work.",
      },
    });

    await prisma.goalContribution.createMany({
      data: [
        { goalId: emergencyGoal.id, userId: user.id, amount: 7500, date: setDate(subMonths(today, 2), 5), note: "Monthly top-up" },
        { goalId: emergencyGoal.id, userId: user.id, amount: 7500, date: setDate(subMonths(today, 1), 5), note: "Monthly top-up" },
        { goalId: emergencyGoal.id, userId: user.id, amount: 7500, date: setDate(today, 5), note: "Monthly top-up" },
        { goalId: tripGoal.id, userId: user.id, amount: 6000, date: setDate(subMonths(today, 1), 10), note: "Saved from freelance" },
        { goalId: tripGoal.id, userId: user.id, amount: 6000, date: setDate(today, 10), note: "Monthly top-up" },
      ],
    });
    log.push("Goals ready.");

    // Recurring transactions
    await prisma.recurringTransaction.createMany({
      data: [
        {
          userId: user.id, walletId: mainWallet.id, categoryId: cat("Salary").id, name: "Monthly Salary",
          type: "income", amount: 55000, frequency: "monthly", dayOfMonth: 1,
          nextRunDate: setDate(addMonths(today, 1), 1), merchant: "Acme Corp", autoCreate: true, isActive: true,
        },
        {
          userId: user.id, walletId: mainWallet.id, categoryId: cat("Housing").id, name: "Condo Rent",
          type: "expense", amount: 15000, frequency: "monthly", dayOfMonth: 2,
          nextRunDate: setDate(addMonths(today, 1), 2), merchant: "Lumpini Condo", autoCreate: true, isActive: true,
        },
        {
          userId: user.id, walletId: mainWallet.id, categoryId: cat("Subscriptions").id, name: "Netflix",
          type: "expense", amount: 419, frequency: "monthly", dayOfMonth: 8,
          nextRunDate: setDate(addMonths(today, 1), 8), merchant: "Netflix", autoCreate: true, isActive: true, isDetected: true,
        },
        {
          userId: user.id, walletId: mainWallet.id, categoryId: cat("Subscriptions").id, name: "Spotify",
          type: "expense", amount: 149, frequency: "monthly", dayOfMonth: 9,
          nextRunDate: setDate(addMonths(today, 1), 9), merchant: "Spotify", autoCreate: true, isActive: true, isDetected: true,
        },
      ],
    });
    log.push("Recurring transactions ready.");

    // Calendar events
    await prisma.calendarEvent.createMany({
      data: [
        { userId: user.id, walletId: mainWallet.id, title: "Condo Rent due", type: "bill", amount: 15000, dueDate: setDate(addMonths(today, 1), 2), notifyDaysBefore: 3 },
        { userId: user.id, walletId: mainWallet.id, title: "Netflix renewal", type: "subscription", amount: 419, dueDate: setDate(addMonths(today, 1), 8), notifyDaysBefore: 1 },
        { userId: user.id, title: "Salary deposit", type: "salary", amount: 55000, dueDate: setDate(addMonths(today, 1), 1), notifyDaysBefore: 0 },
        { userId: user.id, title: "Renew car insurance", type: "reminder", dueDate: addDays(today, 14), notifyDaysBefore: 5, notes: "Compare quotes before renewing." },
      ],
    });
    log.push("Calendar events ready.");

    // Salary allocation plan
    await prisma.salaryAllocationPlan.create({
      data: { userId: user.id, salaryAmount: 55000, savingsPct: 25, investmentPct: 10, billsPct: 45, spendingPct: 20, isActive: true },
    });

    // Financial health score
    await prisma.financialHealthScore.create({
      data: {
        userId: user.id,
        score: 74,
        savingsRateScore: 18,
        debtRatioScore: 16,
        emergencyFundScore: 20,
        budgetAdherenceScore: 12,
        spendingConsistencyScore: 8,
        breakdown: JSON.stringify({ savingsRate: 0.27, emergencyFundMonths: 1.8, budgetAdherence: 0.85 }),
      },
    });

    // AI insights
    await prisma.insight.createMany({
      data: [
        { userId: user.id, type: "monthly", severity: "positive", title: "Great savings rate this month", body: "You saved about 27% of your income this month — ahead of your 25% target. Keep it up!" },
        { userId: user.id, type: "money_leak", severity: "warning", title: "Subscriptions adding up", body: "Netflix, Spotify, and Fitness First together cost ฿2,067/month (~฿24,800/year). Review which ones you still use." },
        { userId: user.id, type: "tip", severity: "info", title: "Coffee runs are a small leak", body: "Starbucks visits this month totaled around ฿650. Brewing at home twice a week could save roughly ฿1,300/month." },
      ],
    });

    // Cashflow forecasts
    const forecastRows = [1, 2, 3].map((i) => {
      const forMonth = startOfMonth(addMonths(today, i));
      return {
        userId: user.id,
        forMonth,
        predictedIncome: 55000,
        predictedExpense: 38000 + i * 500,
        predictedBalance: (mainWallet as { balance: number }).balance + (55000 - (38000 + i * 500)) * i,
        scenario: "baseline",
        assumptions: JSON.stringify({ basedOn: "last 3 months average" }),
      };
    });
    await prisma.cashflowForecast.createMany({ data: forecastRows });

    // Sample AI chat conversation
    await prisma.chatMessage.createMany({
      data: [
        { userId: user.id, role: "user", content: "How much did I spend on food this month?" },
        { userId: user.id, role: "assistant", content: "So far this month you've spent about ฿3,200 on Food & Dining across Starbucks and local restaurants — that's roughly 40% of your ฿8,000 food budget." },
      ],
    });

    log.push("AI modules (insights, forecast, chat, health score) ready.");
    log.push("Seed complete! Log in as demo@moneyflow.ai");

    return NextResponse.json({ ok: true, log });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), log }, { status: 500 });
  }
}
