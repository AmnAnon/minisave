export function formatBalance(value?: string, decimals = 4) {
  return Number(value || "0").toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function humanizeError(err: unknown) {
  const message = err instanceof Error ? err.message : "Transaction failed.";
  const lowered = message.toLowerCase();
  if (lowered.includes("user rejected")) return "Transaction rejected in wallet.";
  if (lowered.includes("insufficient funds")) return "Not enough balance or gas for this action.";
  if (lowered.includes("0x2c5211c6") || lowered.includes("execution reverted")) {
    return "This vault cannot be withdrawn in its current state. It may already be closed, empty, or the selected vault id was stale before refresh.";
  }
  return message;
}
