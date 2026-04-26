import type { ProviderAdapter } from "./types.js";
import { peamsub24hrAdapter } from "./peamsub24hr.js";
import { createScaffoldAdapter } from "./scaffold.js";
import { pays24SellerAdapter } from "./pays24seller.js";
import { rdcwAdapter } from "./rdcw.js";
import { wepayAdapter } from "./wepay.js";

export const providerKeys = ["promptpay", "wepay", "24payseller", "peamsub24hr", "kbiz", "truemoney", "rdcw"] as const;
export type ProviderKey = (typeof providerKeys)[number];

const promptpayAdapter = createScaffoldAdapter("promptpay", "PromptPay");
const walletAdapter = createScaffoldAdapter("kbiz", "K-BIZ / Wallet Matching");
const trueMoneyAdapter = createScaffoldAdapter("truemoney", "TrueMoney");

const providerAdapters: Record<ProviderKey, ProviderAdapter> = {
  promptpay: promptpayAdapter,
  wepay: wepayAdapter,
  "24payseller": pays24SellerAdapter,
  peamsub24hr: peamsub24hrAdapter,
  kbiz: walletAdapter,
  truemoney: trueMoneyAdapter,
  rdcw: rdcwAdapter
};

export function getProviderKeyForProductType(productType?: string | null): ProviderKey | null {
  switch (productType) {
    case "TOPUP_API":
      return "wepay";
    case "PREMIUM_API":
      return "peamsub24hr";
    case "ID_PASS_ORDER":
      return "24payseller";
    case "ACCOUNT_STOCK":
      return "rdcw";
    case "WALLET_TOPUP":
      return "kbiz";
    default:
      return null;
  }
}

export function getProviderAdapter(productType?: string | null): ProviderAdapter {
  const providerKey = getProviderKeyForProductType(productType);
  return providerKey ? providerAdapters[providerKey] : createScaffoldAdapter("manual", "Manual Provider");
}

export function isProviderKey(value: string): value is ProviderKey {
  return providerKeys.includes(value as ProviderKey);
}

export function getProviderAdapterByKey(providerKey: ProviderKey) {
  return providerAdapters[providerKey];
}
