export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        MoneyFlow AI needs an internet connection for this page. Please reconnect and try again.
      </p>
    </div>
  );
}
