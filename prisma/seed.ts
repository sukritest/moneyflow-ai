/**
 * Seed script for MoneyFlow AI.
 *
 * Run with `npm run db:seed` (or automatically after `prisma migrate dev`,
 * since it's registered as the `prisma.seed` entry in package.json).
 *
 * - Always ensures the global system categories exist (income + expense).
 * - Ensures a demo user exists (demo@moneyflow.ai, role "admin" so the
 *   /admin page is reachable out of the box).
 * - On first run, populates ~3 months of realistic transactions, budgets,
 *   goals, recurring transactions, calendar events, a salary plan, a
 *   cashflow forecast, a financial health score, a couple of AI insights,
 *   and a sample chat message — so the app feels alive immediately after
 *   deploy. Safe to re-run: skips the demo-data block if the user already
 *   has transactions.
 */

import { PrismaClient } from "@prisma/client";
import { addDays, addMonths, setDate, startOfMonth, subMonths } from "date-fns";

const prisma = new PrismaClient();

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

async function seedCategories() {
  const existing = await prisma.category.count({ where: { isSystem: true } });
  if (existing === 0) {
    await prisma.category.createMany({
      data: [
        ...EXPENSE_CATEGORIES.map((c) => ({ ...c, type: "expense", isSystem: true, userId: null })),
        ...INCOME_CATEGORIES.map((c) => ({ ...c, type: "income", isSystem: true, userId: null })),
      ],
    });
    console.log(`Seeded ${EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length} system categories.`);
  } else {
    console.log("System categories already exist, skipping.");
  }
  return prisma.category.findMany({ where: { isSystem: true } });
}

async function main() {
  const categories = await seedCategories();
  const cat = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Category not found: ${name}`);
    return found;
  };

  // ---------------------------------------------------------------------
  // Demo user
  // ---------------------------------------------------------------------
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
  console.log(`Demo user: ${user.email} (${user.id})`);

  // ---------------------------------------------------------------------
  // Wallets
  // ---------------------------------------------------------------------
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
  console.log("Wallets ready.");

  // ---------------------------------------------------------------------
  // Subscription (Pro plan so all AI features are visible in the demo)
  // ---------------------------------------------------------------------
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
  console.log("Subscription ready.");

  // ---------------------------------------------------------------------
  // Everything below is one-time demo data. Skip if already seeded.
  // ---------------------------------------------------------------------
  const txnCount = await prisma.transaction.count({ where: { userId: user.id } });
  if (txnCount > 0) {
    console.log("Demo transactions already exist, skipping bulk demo data.");
    await prisma.$disconnect();
    return;
  }

  // Tags
  const tagDefs = [
    { name: "essential", color: "#22c55e" },
    { name: "work", color: "#6366f1" },
    { name: "fun", color: "#ec4899" },
    { name: "subscription", color: "#a855f7" },
  ];
  const tags: Record<string, { id: string }> = {};
  for (const t of tagDefs) {
    tags[t.name] = await prisma.tag.create({ data: { userId: user.id, name: t.name, color: t.color } });
  }
  console.log("Tags ready.");

  // -- Transactions: salary + rent + a spread of expenses for the last 3 months --
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
  let createdCount = 0;

  for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
    const monthStart = startOfMonth(subMonths(today, monthsAgo));

    // Salary income on the 1st
    await prisma.transaction.create({
      data: {
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
        tags: { create: [{ tagId: tags.work.id }] },
      },
    });
    createdCount++;

    // Occasional freelance income in 1 of 3 months
    if (monthsAgo === 1) {
      await prisma.transaction.create({
        data: {
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
          tags: { create: [{ tagId: tags.work.id }] },
        },
      });
      createdCount++;
    }

    for (const tpl of monthlyExpenseTemplates) {
      for (const day of tpl.days) {
        // Skip days that don't exist in shorter months
        if (day > 28) continue;
        const date = setDate(monthStart, day);
        if (date > today) continue;

        await prisma.transaction.create({
          data: {
            userId: user.id,
            walletId: mainWallet.id,
            categoryId: cat(tpl.category).id,
            type: "expense",
            amount: rand(tpl.min, tpl.max),
            currency: "THB",
            date,
            merchant: tpl.merchant,
            source: "manual",
            ...(tpl.tag ? { tags: { create: [{ tagId: tags[tpl.tag].id }] } } : {}),
          },
        });
        createdCount++;
      }
    }
  }
  console.log(`Created ${createdCount} transactions.`);

  // -- Budgets --
  await prisma.budget.createMany({
    data: [
      {
        userId: user.id,
        name: "Overall monthly budget",
        amount: 40000,
        period: "monthly",
        categoryId: null,
        alertThreshold: 0.9,
      },
      {
        userId: user.id,
        name: "Food & Dining",
        amount: 8000,
        period: "monthly",
        categoryId: cat("Food & Dining").id,
        alertThreshold: 0.8,
      },
      {
        userId: user.id,
        name: "Shopping",
        amount: 5000,
        period: "monthly",
        categoryId: cat("Shopping").id,
        alertThreshold: 0.8,
      },
      {
        userId: user.id,
        name: "Entertainment",
        amount: 2000,
        period: "monthly",
        categoryId: cat("Entertainment").id,
        alertThreshold: 0.8,
      },
    ],
  });
  console.log("Budgets ready.");

  // -- Goals --
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
  console.log("Goals ready.");

  // -- Recurring transactions --
  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId: user.id,
        walletId: mainWallet.id,
        categoryId: cat("Salary").id,
        name: "Monthly Salary",
        type: "income",
        amount: 55000,
        frequency: "monthly",
        dayOfMonth: 1,
        nextRunDate: setDate(addMonths(today, 1), 1),
        merchant: "Acme Corp",
        autoCreate: true,
        isActive: true,
      },
      {
        userId: user.id,
        walletId: mainWallet.id,
        categoryId: cat("Housing").id,
        name: "Condo Rent",
        type: "expense",
        amount: 15000,
        frequency: "monthly",
        dayOfMonth: 2,
        nextRunDate: setDate(addMonths(today, 1), 2),
        merchant: "Lumpini Condo",
        autoCreate: true,
        isActive: true,
      },
      {
        userId: user.id,
        walletId: mainWallet.id,
        categoryId: cat("Subscriptions").id,
        name: "Netflix",
        type: "expense",
        amount: 419,
        frequency: "monthly",
        dayOfMonth: 8,
        nextRunDate: setDate(addMonths(today, 1), 8),
        merchant: "Netflix",
        autoCreate: true,
        isActive: true,
        isDetected: true,
      },
      {
        userId: user.id,
        walletId: mainWallet.id,
        categoryId: cat("Subscriptions").id,
        name: "Spotify",
        type: "expense",
        amount: 149,
        frequency: "monthly",
        dayOfMonth: 9,
        nextRunDate: setDate(addMonths(today, 1), 9),
        merchant: "Spotify",
        autoCreate: true,
        isActive: true,
        isDetected: true,
      },
    ],
  });
  console.log("Recurring transactions ready.");

  // -- Calendar events (upcoming bills/reminders) --
  await prisma.calendarEvent.createMany({
    data: [
      {
        userId: user.id,
        walletId: mainWallet.id,
        title: "Condo Rent due",
        type: "bill",
        amount: 15000,
        dueDate: setDate(addMonths(today, 1), 2),
        notifyDaysBefore: 3,
      },
      {
        userId: user.id,
        walletId: mainWallet.id,
        title: "Netflix renewal",
        type: "subscription",
        amount: 419,
        dueDate: setDate(addMonths(today, 1), 8),
        notifyDaysBefore: 1,
      },
      {
        userId: user.id,
        title: "Salary deposit",
        type: "salary",
        amount: 55000,
        dueDate: setDate(addMonths(today, 1), 1),
        notifyDaysBefore: 0,
      },
      {
        userId: user.id,
        title: "Renew car insurance",
        type: "reminder",
        dueDate: addDays(today, 14),
        notifyDaysBefore: 5,
        notes: "Compare quotes before renewing.",
      },
    ],
  });
  console.log("Calendar events ready.");

  // -- Salary allocation plan --
  await prisma.salaryAllocationPlan.create({
    data: {
      userId: user.id,
      salaryAmount: 55000,
      savingsPct: 25,
      investmentPct: 10,
      billsPct: 45,
      spendingPct: 20,
      isActive: true,
    },
  });

  // -- Financial health score --
  await prisma.financialHealthScore.create({
    data: {
      userId: user.id,
      score: 74,
      savingsRateScore: 18,
      debtRatioScore: 16,
      emergencyFundScore: 20,
      budgetAdherenceScore: 12,
      spendingConsistencyScore: 8,
      breakdown: JSON.stringify({
        savingsRate: 0.27,
        emergencyFundMonths: 1.8,
        budgetAdherence: 0.85,
      }),
    },
  });

  // -- AI insights --
  await prisma.insight.createMany({
    data: [
      {
        userId: user.id,
        type: "monthly",
        severity: "positive",
        title: "Great savings rate this month",
        body: "You saved about 27% of your income this month — ahead of your 25% target. Keep it up!",
      },
      {
        userId: user.id,
        type: "money_leak",
        severity: "warning",
        title: "Subscriptions adding up",
        body: "Netflix, Spotify, and Fitness First together cost ฿2,067/month (~฿24,800/year). Review which ones you still use.",
      },
      {
        userId: user.id,
        type: "tip",
        severity: "info",
        title: "Coffee runs are a small leak",
        body: "Starbucks visits this month totaled around ฿650. Brewing at home twice a week could save roughly ฿1,300/month.",
      },
    ],
  });

  // -- Cashflow forecast (baseline, next 3 months) --
  for (let i = 1; i <= 3; i++) {
    const forMonth = startOfMonth(addMonths(today, i));
    await prisma.cashflowForecast.create({
      data: {
        userId: user.id,
        forMonth,
        predictedIncome: 55000,
        predictedExpense: 38000 + i * 500,
        predictedBalance: mainWallet.balance + (55000 - (38000 + i * 500)) * i,
        scenario: "baseline",
        assumptions: JSON.stringify({ basedOn: "last 3 months average" }),
      },
    });
  }

  // -- Sample AI chat conversation --
  await prisma.chatMessage.createMany({
    data: [
      { userId: user.id, role: "user", content: "How much did I spend on food this month?" },
      {
        userId: user.id,
        role: "assistant",
        content: "So far this month you've spent about ฿3,200 on Food & Dining across Starbucks and local restaurants — that's roughly 40% of your ฿8,000 food budget.",
      },
    ],
  });

  console.log("AI modules (insights, forecast, chat, health score) ready.");
  console.log("\nSeed complete! Log in as demo@moneyflow.ai (or just open the app — demo mode auto-logs-in without Supabase configured).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
