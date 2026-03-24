import { contractClient, ContractClient } from "../stellar/contractClient";
import { stellarClient } from "../stellar/client";

export interface DepositParams {
  lender: string; // Stellar address
  amount: string; // Amount in smallest unit (7 decimals)
}

export interface WithdrawParams {
  lender: string;
  amount: string;
}

export class LendingPoolService {
  private contractId: string;
  private contractClient: ContractClient;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.contractClient = contractClient;
  }

  async deposit(
    params: DepositParams,
  ): Promise<{ transactionHash: string; newBalance: string }> {
    const sourceAccount = stellarClient.getKeypair()?.publicKey();
    if (!sourceAccount) throw new Error("No source account available");

    const args = [
      ContractClient.toScVal(params.lender),
      ContractClient.toScVal(Number(params.amount)),
    ];
    const result = await this.contractClient.invokeContract({
      contractId: this.contractId,
      functionName: "deposit",
      args,
      sourceAccount,
    });
    const newBalance = ContractClient.fromScVal(result.result);
    return {
      transactionHash: result.transactionHash,
      newBalance: newBalance.toString(),
    };
  }

  async withdraw(params: WithdrawParams): Promise<string> {
    const sourceAccount = stellarClient.getKeypair()?.publicKey();
    if (!sourceAccount) throw new Error("No source account available");

    const args = [
      ContractClient.toScVal(params.lender),
      ContractClient.toScVal(Number(params.amount)),
    ];
    const result = await this.contractClient.invokeContract({
      contractId: this.contractId,
      functionName: "withdraw",
      args,
      sourceAccount,
    });
    return result.transactionHash;
  }

  async getBalance(lender: string): Promise<string> {
    const result = await this.contractClient.readContract(
      this.contractId,
      "get_balance",
      [ContractClient.toScVal(lender)],
    );
    const balance = ContractClient.fromScVal(result);
    return balance.toString();
  }

  async isPaused(): Promise<boolean> {
    const result = await this.contractClient.readContract(
      this.contractId,
      "is_paused",
      [],
    );
    return ContractClient.fromScVal(result) as boolean;
  }
}
