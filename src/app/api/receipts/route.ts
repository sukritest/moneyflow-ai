import { NextRequest, NextResponse } from "next/server";
import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runReceiptOcr } from "@/lib/ai/receipts";

export async function GET() {
  const user = await getActiveUser();
  const receipts = await prisma.receipt.findMany({
    where: { userId: user.id },
    include: { transaction: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ receipts });
}

export async function POST(request: NextRequest) {
  const user = await getActiveUser();
  const body = await request.json();

  if (typeof body.imageUrl !== "string" || !body.imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  const receipt = await prisma.receipt.create({
    data: {
      userId: user.id,
      imageUrl: body.imageUrl,
      status: "processing",
    },
  });

  try {
    const ocr = await runReceiptOcr(body.imageUrl);
    const updated = await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        status: "processed",
        ocrMerchant: ocr.merchant,
        ocrAmount: ocr.amount,
        ocrDate: new Date(ocr.date),
        ocrCategory: ocr.category,
        ocrRawText: ocr.rawText,
        confidence: ocr.confidence,
      },
      include: { transaction: true },
    });
    return NextResponse.json({ receipt: updated }, { status: 201 });
  } catch (err) {
    console.error("Receipt OCR failed:", err);
    const failed = await prisma.receipt.update({
      where: { id: receipt.id },
      data: { status: "failed" },
      include: { transaction: true },
    });
    return NextResponse.json({ receipt: failed }, { status: 201 });
  }
}
