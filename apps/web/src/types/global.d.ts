export {};

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
      request?: (...args: unknown[]) => Promise<unknown>;
      on?: (...args: unknown[]) => void;
      removeListener?: (...args: unknown[]) => void;
    };
  }
}
