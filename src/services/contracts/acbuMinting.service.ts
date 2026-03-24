import { contractClient, ContractClient } from "../stellar/contractClient";
import { stellarClient } from "../stellar/client";
import { logger } from "../../config/logger";

export interface MintFromUsdcParams {
  usdcAmount: string; // Amount in smallest unit (7 decimals)
  recipient: string; // Stellar address
}

export interface MintFromFiatParams {
  currency: string; // Currency code (NGN, KES, RWF)
  amount: string; // Amount in smallest unit
  recipient: string; // Stellar address
  fintechTxId: string; // Fintech transaction ID
}

export class MintingService {
  private contractId: string;
  private contractClient: ContractClient;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.contractClient = contractClient;
  }

  /**
   * Mint ACBU from USDC deposit
   */
  async mintFromUsdc(params: MintFromUsdcParams): Promise<{
    transactionHash: string;
    acbuAmount: string;
  }> {
    try {
      logger.info("Minting ACBU from USDC", params);

      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      // Convert amount to i128 (7 decimals)
      const usdcAmount = BigInt(params.usdcAmount);
      const recipient = params.recipient;

      // Build function arguments
      const args = [
        ContractClient.toScVal(Number(usdcAmount)),
        ContractClient.toScVal(recipient),
      ];

      // Invoke contract
      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "mint_from_usdc",
        args,
        sourceAccount,
      });

      // Parse result (ACBU amount minted)
      const acbuAmount = ContractClient.fromScVal(result.result);

      logger.info("Minting successful", {
        transactionHash: result.transactionHash,
        acbuAmount: acbuAmount.toString(),
      });

      return {
        transactionHash: result.transactionHash,
        acbuAmount: acbuAmount.toString(),
      };
    } catch (error) {
      logger.error("Failed to mint from USDC", { params, error });
      throw error;
    }
  }

  /**
   * Mint ACBU from fiat deposit
   */
  async mintFromFiat(params: MintFromFiatParams): Promise<{
    transactionHash: string;
    acbuAmount: string;
  }> {
    try {
      logger.info("Minting ACBU from fiat", params);

      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      // Build function arguments
      const args = [
        ContractClient.toScVal(params.currency),
        ContractClient.toScVal(params.amount),
        ContractClient.toScVal(params.recipient),
        ContractClient.toScVal(params.fintechTxId),
      ];

      // Invoke contract
      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "mint_from_fiat",
        args,
        sourceAccount,
      });

      // Parse result
      const acbuAmount = ContractClient.fromScVal(result.result);

      logger.info("Fiat minting successful", {
        transactionHash: result.transactionHash,
        acbuAmount: acbuAmount.toString(),
      });

      return {
        transactionHash: result.transactionHash,
        acbuAmount: acbuAmount.toString(),
      };
    } catch (error) {
      logger.error("Failed to mint from fiat", { params, error });
      throw error;
    }
  }

  /**
   * Get current fee rate
   */
  async getFeeRate(): Promise<number> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_fee_rate",
        [],
      );

      const feeRate = ContractClient.fromScVal(result);
      return Number(feeRate);
    } catch (error) {
      logger.error("Failed to get fee rate", { error });
      throw error;
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "is_paused",
        [],
      );

      return ContractClient.fromScVal(result) as boolean;
    } catch (error) {
      logger.error("Failed to check pause status", { error });
      throw error;
    }
  }

  /**
   * Pause the contract (admin only)
   */
  async pause(): Promise<string> {
    try {
      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "pause",
        args: [],
        sourceAccount,
      });

      logger.info("Contract paused", {
        transactionHash: result.transactionHash,
      });

      return result.transactionHash;
    } catch (error) {
      logger.error("Failed to pause contract", { error });
      throw error;
    }
  }

  /**
   * Unpause the contract (admin only)
   */
  async unpause(): Promise<string> {
    try {
      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "unpause",
        args: [],
        sourceAccount,
      });

      logger.info("Contract unpaused", {
        transactionHash: result.transactionHash,
      });

      return result.transactionHash;
    } catch (error) {
      logger.error("Failed to unpause contract", { error });
      throw error;
    }
  }
}
