import type { ProviderAdapter } from "./types";
import { createScaffoldAdapter } from "./scaffold";

const wepayAdapter = createScaffoldAdapter("wepay", "Wepay");
const pays24SellerAdapter = createScaffoldAdapter("24payseller", "24Payseller");
const peamsub24hrAdapter = createScaffoldAdapter("peamsub24hr", "Peamsub24hr");
const walletAdapter = createScaffoldAdapter("kbiz", "K-BIZ / Wallet Matching");

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
