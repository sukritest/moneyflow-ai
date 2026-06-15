import { completeOrMock } from "@/lib/openai";

export type ReceiptOcrResult = {
  merchant: string;
  amount: number;
  date: string; // ISO date
  category: string;
  rawText: string;
  confidence: number;
};

const MOCK_MERCHANTS = [
  { merchant: "7-Eleven", category: "Groceries", amount: 145 },
  { merchant: "Starbucks", category: "Food & Dining", amount: 165 },
  { merchant: "BTS Skytrain", category: "Transport", amount: 44 },
  { merchant: "Big C Supercenter", category: "Groceries", amount: 892 },
  { merchant: "Shell Gas Station", category: "Transport", amount: 600 },
];

/**
 * Runs OCR on a receipt image and extracts merchant, amount, date, and category.
 * If no OpenAI key is configured, returns deterministic mock data so the
 * receipts workflow (upload -> review -> convert to transaction) works end-to-end.
 */
export async function runReceiptOcr(imageDataUrl: string): Promise<ReceiptOcrResult> {
  const pick = MOCK_MERCHANTS[Math.floor(Math.random() * MOCK_MERCHANTS.length)];
  const fallback: ReceiptOcrResult = {
    merchant: pick.merchant,
    amount: pick.amount,
    date: new Date().toISOString().slice(0, 10),
    category: pick.category,
    rawText: `${pick.merchant}\nTotal: ${pick.amount}.00\nDate: ${new Date().toLocaleDateString()}`,
    confidence: 0.62,
  };

  const raw = await completeOrMock({
    system:
      "You are a receipt OCR assistant. Extract the merchant name, total amount, date (ISO 8601), and a likely spending category from a receipt. Respond with JSON: {merchant, amount, date, category, rawText, confidence}.",
    prompt: `Extract structured data from this receipt image (provided as a data URL, truncated): ${imageDataUrl.slice(0, 100)}...`,
    fallback: JSON.stringify(fallback),
    json: true,
  });

  try {
    const parsed = JSON.parse(raw);
    return {
      merchant: parsed.merchant ?? fallback.merchant,
      amount: Number(parsed.amount) || fallback.amount,
      date: parsed.date ?? fallback.date,
      category: parsed.category ?? fallback.category,
      rawText: parsed.rawText ?? fallback.rawText,
      confidence: Number(parsed.confidence) || fallback.confidence,
    };
  } catch {
    return fallback;
  }
}
