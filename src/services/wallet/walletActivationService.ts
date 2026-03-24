/**
 * Send minimum XLM to user's Stellar address to activate the wallet (create account on-chain).
 * Called when user has paid KYC fee; platform Stellar wallet is the source.
 * using pi instead of xlm
 */
import { Operation, TransactionBuilder } from "stellar-sdk";
import { config } from "../../config/env";
import { stellarClient } from "../stellar/client";
import { logger } from "../../config/logger";

/**
 * Send minBalanceXlm to the given address (createAccount or payment if account exists).
 * Uses platform stellar.secretKey as source. Throws on failure.
 */
export async function sendXlmToActivate(
  stellarAddress: string,
): Promise<string> {
  const keypair = stellarClient.getKeypair();
  if (!keypair) {
    throw new Error("Platform Stellar key not configured; cannot fund wallet");
  }
  const sourceAccountId = keypair.publicKey();
  const amountXlm = config.stellar.minBalanceXlm ?? 1;
  const server = stellarClient.getServer();
  const networkPassphrase = stellarClient.getNetworkPassphrase();
  const sourceAccount = await server.loadAccount(sourceAccountId);

  const op = Operation.createAccount({
    destination: stellarAddress,
    startingBalance: String(amountXlm),
  });

  const builder = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase,
  }).addOperation(op);
  const transaction = builder.build();
  transaction.sign(keypair);
  try {
    const result = await server.submitTransaction(transaction);
    logger.info("Wallet activated with XLM", {
      stellarAddress: stellarAddress.slice(0, 8) + "…",
      amountXlm,
      hash: result.hash,
    });
    return result.hash;
  } catch (err: unknown) {
    const e = err as {
      response?: {
        data?: { extras?: { result_codes?: { operations?: string[] } } };
      };
      message?: string;
    };
    const opCode =
      e?.response?.data?.extras?.result_codes?.operations?.[0] ?? "";
    const msg = opCode || (e?.message ?? String(err));
    if (
      msg.includes("op_already_exists") ||
      msg.includes("CREATE_ACCOUNT_ALREADY_EXIST")
    ) {
      logger.info("Wallet already funded, skip activation", {
        stellarAddress: stellarAddress.slice(0, 8) + "…",
      });
      return "already_exists";
    }
    throw err;
  }
}
