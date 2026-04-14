import { contractClient, ContractClient } from "../stellar/contractClient";
import { stellarClient } from "../stellar/client";
import { logger } from "../../config/logger";

export interface UpdateReserveParams {
  updater: string; // The authorized address performing the update
  currency: string; // Currency code (NGN, KES, RWF)
  amount: string; // Reserve amount in native currency (7 decimals)
  valueUsd: string; // Reserve value in USD (7 decimals)
}

export interface ReserveData {
  currency: string;
  amount: string;
  valueUsd: string;
  timestamp: number;
}

export class ReserveTrackerService {
  private contractId: string;
  private contractClient: ContractClient;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.contractClient = contractClient;
  }

  /**
   * Update reserve for a currency (backend function)
   */
  async updateReserve(params: UpdateReserveParams): Promise<string> {
    try {
      logger.info("Updating reserve", params);

      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      // Build function arguments: [updater, currency, amount, value_usd]
      const args = [
        ContractClient.toScVal(params.updater),
        ContractClient.toScVal(params.currency),
        ContractClient.toScVal(BigInt(params.amount)),
        ContractClient.toScVal(BigInt(params.valueUsd)),
      ];

      // Invoke contract
      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "update_reserve",
        args,
        sourceAccount,
      });

      logger.info("Reserve update successful", {
        transactionHash: result.transactionHash,
        currency: params.currency,
      });

      return result.transactionHash;
    } catch (error) {
      logger.error("Failed to update reserve", { params, error });
      throw error;
    }
  }

  /**
   * Get reserve data for a currency
   */
  async getReserve(currency: string): Promise<ReserveData> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_reserve",
        [ContractClient.toScVal(currency)],
      );

      const reserveData = ContractClient.fromScVal(result) as any;
      return {
        currency: reserveData.currency.toString(),
        amount: reserveData.amount.toString(),
        valueUsd: reserveData.value_usd.toString(),
        timestamp: Number(reserveData.timestamp),
      };
    } catch (error) {
      logger.error("Failed to get reserve", { currency, error });
      throw error;
    }
  }

  /**
   * Verify reserves meet overcollateralization requirements
   */
  async verifyReserves(totalAcbuSupply: string): Promise<boolean> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "verify_reserves",
        [ContractClient.toScVal(BigInt(totalAcbuSupply))],
      );

      return ContractClient.fromScVal(result) as boolean;
    } catch (error) {
      logger.error("Failed to verify reserves", { error });
      throw error;
    }
  }

  /**
   * Get total reserve value in USD
   */
  async getTotalReserveValue(): Promise<string> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_total_reserve_value",
        [],
      );

      const totalValue = ContractClient.fromScVal(result);
      return totalValue.toString();
    } catch (error) {
      logger.error("Failed to get total reserve value", { error });
      throw error;
    }
  }

  /**
   * Get minimum required ratio
   */
  async getMinRatio(): Promise<number> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_min_ratio",
        [],
      );

      const minRatio = ContractClient.fromScVal(result);
      return Number(minRatio) / 10000; // Convert from basis points to decimal
    } catch (error) {
      logger.error("Failed to get min ratio", { error });
      throw error;
    }
  }

  /**
   * Get target ratio
   */
  async getTargetRatio(): Promise<number> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_target_ratio",
        [],
      );

      const targetRatio = ContractClient.fromScVal(result);
      return Number(targetRatio) / 10000; // Convert from basis points to decimal
    } catch (error) {
      logger.error("Failed to get target ratio", { error });
      throw error;
    }
  }
}
