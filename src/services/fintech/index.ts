/**
 * Fintech provider router and types. Import from here so the router is wired with all providers.
 */
import { config } from "../../config/env";
import { flutterwaveProvider } from "../flutterwave/client";
import { PaystackClient } from "../paystack/client";
import { MTNMoMoClient } from "../mtn-momo/client";
import { FintechProviderRouter, setFintechRouter } from "./router";
import type { FintechProviderId } from "./types";

const currencyProviders = (config.fintech?.currencyProviders ?? {}) as Record<
  string,
  FintechProviderId
>;
const router = new FintechProviderRouter(currencyProviders);
router.register("flutterwave", flutterwaveProvider);
router.register(
  "paystack",
  new PaystackClient({ fxFallback: flutterwaveProvider }),
);
router.register("mtn_momo", new MTNMoMoClient());
setFintechRouter(router);

export {
  getFintechRouter,
  setFintechRouter,
  FintechProviderRouter,
} from "./router";
export type {
  FintechProvider,
  FintechProviderId,
  DisburseRecipient,
} from "./types";
