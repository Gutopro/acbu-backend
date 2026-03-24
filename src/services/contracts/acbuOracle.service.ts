import { contractClient, ContractClient } from "../stellar/contractClient";
import { stellarClient } from "../stellar/client";
import { logger } from "../../config/logger";

export interface UpdateRateParams {
  currency: string; // Currency code (NGN, KES, RWF)
  rate: string; // Rate in 7 decimals
  sources: string[]; // Source rates for median calculation
  timestamp: number; // Unix timestamp
}

export class OracleService {
  private contractId: string;
  private contractClient: ContractClient;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.contractClient = contractClient;
  }

  /**
   * Update exchange rate for a currency (validator function)
   */
  async updateRate(params: UpdateRateParams): Promise<string> {
    try {
      logger.info("Updating oracle rate", params);

      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      // Build function arguments
      const args = [
        ContractClient.toScVal(params.currency),
        ContractClient.toScVal(params.rate),
        ContractClient.toScVal(params.sources),
        ContractClient.toScVal(params.timestamp),
      ];

      // Invoke contract
      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "update_rate",
        args,
        sourceAccount,
      });

      logger.info("Rate update successful", {
        transactionHash: result.transactionHash,
        currency: params.currency,
      });

      return result.transactionHash;
    } catch (error) {
      logger.error("Failed to update rate", { params, error });
      throw error;
    }
  }

  /**
   * Get current rate for a currency
   */
  async getRate(currency: string): Promise<string> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_rate",
        [ContractClient.toScVal(currency)],
      );

      const rate = ContractClient.fromScVal(result);
      return rate.toString();
    } catch (error) {
      logger.error("Failed to get rate", { currency, error });
      throw error;
    }
  }

  /**
   * Get ACBU/USD rate (basket-weighted)
   */
  async getAcbuUsdRate(): Promise<string> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_acbu_usd_rate",
        [],
      );

      const rate = ContractClient.fromScVal(result);
      return rate.toString();
    } catch (error) {
      logger.error("Failed to get ACBU/USD rate", { error });
      throw error;
    }
  }

  /**
   * Get all validators
   */
  async getValidators(): Promise<string[]> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_validators",
        [],
      );

      const validators = ContractClient.fromScVal(result) as any[];
      return validators.map((v) => v.toString());
    } catch (error) {
      logger.error("Failed to get validators", { error });
      throw error;
    }
  }

  /**
   * Get minimum signatures required
   */
  async getMinSignatures(): Promise<number> {
    try {
      const result = await this.contractClient.readContract(
        this.contractId,
        "get_min_signatures",
        [],
      );

      const minSigs = ContractClient.fromScVal(result);
      return Number(minSigs);
    } catch (error) {
      logger.error("Failed to get min signatures", { error });
      throw error;
    }
  }

  /**
   * Add validator (admin only)
   */
  async addValidator(validatorAddress: string): Promise<string> {
    try {
      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available");
      }

      const result = await this.contractClient.invokeContract({
        contractId: this.contractId,
        functionName: "add_validator",
        args: [ContractClient.toScVal(validatorAddress)],
        sourceAccount,
      });

      logger.info("Validator added", {
        transactionHash: result.transactionHash,
        validator: validatorAddress,
      });

      return result.transactionHash;
    } catch (error) {
      logger.error("Failed to add validator", { validatorAddress, error });
      throw error;
    }
  }
}
