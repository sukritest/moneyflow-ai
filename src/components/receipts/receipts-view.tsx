"use client";

import * as React from "react";
import { ScanLine, Upload, Loader2, Trash2, CheckCircle2, ArrowRight, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceiptConvertForm } from "@/components/receipts/receipt-convert-form";
import { useLocale } from "@/lib/i18n/locale-provider";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Category, Wallet, Receipt, Transaction } from "@prisma/client";

type ReceiptWithRelations = Receipt & { transaction: Transaction | null };

type ReceiptsViewProps = {
  initialReceipts: ReceiptWithRelations[];
  categories: Category[];
  wallets: Wallet[];
  currency: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-warning/15 text-warning",
  processed: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
};

export function ReceiptsView({ initialReceipts, categories, wallets, currency }: ReceiptsViewProps) {
  const { locale, t } = useLocale();
  const [receipts, setReceipts] = React.useState(initialReceipts);
  const [uploading, setUploading] = React.useState(false);
  const [convertTarget, setConvertTarget] = React.useState<ReceiptWithRelations | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/receipts");
    if (res.ok) {
      const data = await res.json();
      setReceipts(data.receipts);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = reader.result as string;
      await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      await refresh();
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  async function handleDelete(receipt: ReceiptWithRelations) {
    if (!confirm(t("receipts.deleteConfirm"))) return;
    await fetch(`/api/receipts/${receipt.id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("receipts.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("receipts.subtitle")}</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {t("receipts.upload")}
          </Button>
        </div>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <ScanLine className="h-5 w-5 shrink-0" />
          <p>{t("receipts.mockNotice")}</p>
        </CardContent>
      </Card>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ScanLine className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("receipts.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("receipts.emptyHint")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="overflow-hidden">
              <div className="flex h-32 items-center justify-center bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receipt.imageUrl} alt="Receipt" className="h-full w-full object-cover" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{receipt.ocrMerchant ?? t("receipts.processing")}</CardTitle>
                  <Badge className={cn(STATUS_STYLES[receipt.status])}>{t(`receipts.status.${receipt.status}`)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {receipt.status === "processing" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("receipts.scanning")}
                  </div>
                )}
                {receipt.status === "failed" && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <FileWarning className="h-4 w-4" />
                    {t("receipts.failed")}
                  </div>
                )}
                {receipt.status === "processed" && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("transactions.amount")}</span>
                      <span className="font-semibold">
                        {receipt.ocrAmount != null ? formatCurrency(receipt.ocrAmount, currency, locale) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("transactions.date")}</span>
                      <span>{receipt.ocrDate ? formatDate(receipt.ocrDate, locale) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("transactions.category")}</span>
                      <span>{receipt.ocrCategory ?? "—"}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3">
                  {receipt.transaction ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      {t("receipts.linked")}
                    </span>
                  ) : receipt.status === "processed" ? (
                    <Button size="sm" variant="outline" onClick={() => setConvertTarget(receipt)}>
                      {t("receipts.convertToTransaction")}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(receipt)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReceiptConvertForm
        open={Boolean(convertTarget)}
        onOpenChange={(open) => !open && setConvertTarget(null)}
        categories={categories}
        wallets={wallets}
        receipt={convertTarget}
        onSaved={refresh}
      />
    </div>
  );
}
