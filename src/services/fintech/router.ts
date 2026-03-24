/**
 * Routes currency to the right fintech provider per FINTECH_PARTNERSHIPS.MD.
 * Default: NGN→paystack, RWF→mtn_momo, others→flutterwave.
 * Falls back to flutterwave when the mapped provider is not registered.
 */

import type { FintechProvider, FintechProviderId } from "./types";

/** Default currency → provider id (plan Part C). Overridable via config. */
const DEFAULT_CURRENCY_PROVIDERS: Record<string, FintechProviderId> = {
  NGN: "paystack",
  KES: "flutterwave",
  RWF: "mtn_momo",
  ZAR: "flutterwave",
  GHS: "flutterwave",
  EGP: "flutterwave",
  MAD: "flutterwave",
  TZS: "flutterwave",
  UGX: "flutterwave",
  XOF: "flutterwave",
};

export class FintechProviderRouter {
  private providers: Map<FintechProviderId, FintechProvider> = new Map();
  private currencyProviders: Record<string, FintechProviderId>;

  constructor(currencyProviders?: Record<string, FintechProviderId>) {
    this.currencyProviders = currencyProviders ?? DEFAULT_CURRENCY_PROVIDERS;
  }

  register(id: FintechProviderId, provider: FintechProvider): void {
    this.providers.set(id, provider);
  }

  getProvider(currency: string): FintechProvider {
    const id = this.currencyProviders[currency] ?? "flutterwave";
    const provider = this.providers.get(id);
    if (provider) return provider;
    const fallback = this.providers.get("flutterwave");
    if (fallback) return fallback;
    throw new Error(
      `No fintech provider for currency ${currency}; flutterwave not registered`,
    );
  }

  /** Get provider by id (e.g. 'flutterwave' for FX fallback). */
  getProviderById(id: FintechProviderId): FintechProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Fintech provider ${id} not registered`);
    }
    return provider;
  }
}

/** Singleton router; set by fintech/index.ts after registering providers. */
let routerInstance: FintechProviderRouter | null = null;

/**
 * Get the shared router. Import from 'services/fintech' so that index has run and providers are registered.
 */
export function getFintechRouter(): FintechProviderRouter {
  if (!routerInstance) {
    throw new Error(
      "Fintech router not initialized. Import from services/fintech so providers are registered.",
    );
  }
  return routerInstance;
}

/**
 * Set the router instance. Used by fintech/index.ts to wire flutterwave, paystack, mtn_momo.
 */
export function setFintechRouter(router: FintechProviderRouter): void {
  routerInstance = router;
}
