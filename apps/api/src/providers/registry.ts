import type { ProviderAdapter } from "./types";
import { createScaffoldAdapter } from "./scaffold";

export const providerKeys = ["wepay", "24payseller", "peamsub24hr", "kbiz", "truemoney", "rdcw"] as const;
export type ProviderKey = (typeof providerKeys)[number];

const wepayAdapter = createScaffoldAdapter("wepay", "Wepay");
const pays24SellerAdapter = createScaffoldAdapter("24payseller", "24Payseller");
const peamsub24hrAdapter = createScaffoldAdapter("peamsub24hr", "Peamsub24hr");
const walletAdapter = createScaffoldAdapter("kbiz", "K-BIZ / Wallet Matching");
const trueMoneyAdapter = createScaffoldAdapter("truemoney", "TrueMoney");
const rdcwAdapter = createScaffoldAdapter("rdcw", "RDCW");

const providerAdapters: Record<ProviderKey, ProviderAdapter> = {
  wepay: wepayAdapter,
  "24payseller": pays24SellerAdapter,
  peamsub24hr: peamsub24hrAdapter,
  kbiz: walletAdapter,
  truemoney: trueMoneyAdapter,
  rdcw: rdcwAdapter
};

export function getProviderAdapter(productType?: string | null): ProviderAdapter {
  switch (productType) {
    case "TOPUP_API":
      return wepayAdapter;
    case "PREMIUM_API":
      return peamsub24hrAdapter;
    case "ID_PASS_ORDER":
      return pays24SellerAdapter;
    case "WALLET_TOPUP":
      return walletAdapter;
    default:
      return createScaffoldAdapter("manual", "Manual Provider");
  }
}

export function isProviderKey(value: string): value is ProviderKey {
  return providerKeys.includes(value as ProviderKey);
}

export function getProviderAdapterByKey(providerKey: ProviderKey) {
  return providerAdapters[providerKey];
}
