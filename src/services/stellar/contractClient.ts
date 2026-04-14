import {
  TransactionBuilder,
  Operation,
  xdr,
  Address,
  SorobanRpc,
} from "stellar-sdk";
import { stellarClient } from "./client";
import { getBaseFee } from "./feeManager";
import { logger } from "../../config/logger";

export interface ContractCallOptions {
  contractId: string;
  functionName: string;
  args: xdr.ScVal[];
  sourceAccount: string;
  fee?: string;
}

export interface ContractInvokeResult {
  transactionHash: string;
  result: xdr.ScVal;
  ledger: number;
}

export class ContractClient {
  // private server: ReturnType<typeof stellarClient.getServer>;
  private networkPassphrase: string;

  constructor() {
    // this.server = stellarClient.getServer();
    this.networkPassphrase = stellarClient.getNetworkPassphrase();
  }

  /**
   * Helper to convert BigInt to ScVal i128
   */
  static bigIntToI128(value: bigint): xdr.ScVal {
    const b = BigInt(value);
    const lo = b & BigInt("0xFFFFFFFFFFFFFFFF");
    const hi = b >> BigInt(64);
    return xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(lo.toString()),
        hi: xdr.Int64.fromString(hi.toString()),
      }),
    );
  }

  /**
   * Invoke a contract function
   */
  async invokeContract(
    options: ContractCallOptions,
  ): Promise<ContractInvokeResult> {
    try {
      const { contractId, functionName, args, sourceAccount, fee } = options;

      logger.info("Invoking contract function", {
        contractId,
        functionName,
        sourceAccount,
      });

      const invokeOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(contractId).toScAddress(),
            functionName: xdr.ScVal.scvSymbol(functionName).sym()!,
            args,
          }),
        ),
        auth: [],
      });

      const sourceAccountObj = await stellarClient.getAccount(sourceAccount);
      const builder = new TransactionBuilder(sourceAccountObj, {
        fee: fee || (await getBaseFee()),
        networkPassphrase: this.networkPassphrase,
      });
      builder.setTimeout(0);

      builder.addOperation(invokeOp);
      let transaction = builder.build();

      const rpcServer = new SorobanRpc.Server(stellarClient.getNetwork() === "mainnet" ? "https://soroban-mainnet.stellar.org" : "https://soroban-testnet.stellar.org");
      transaction = (await rpcServer.prepareTransaction(transaction)) as any;

      const keypair = stellarClient.getKeypair();
      if (keypair) {
        transaction.sign(keypair);
      }

      const result = await stellarClient.submitTransaction(transaction);
      const resultXdr = this.parseTransactionResult(result);

      return {
        transactionHash: result.hash,
        result: resultXdr,
        ledger: result.ledger || 0,
      };
    } catch (error) {
      logger.error("Failed to invoke contract", {
        contractId: options.contractId,
        functionName: options.functionName,
        error,
      });
      throw error;
    }
  }

  /**
   * Read contract data (simulate call without submitting)
   */
  async readContract(
    contractId: string,
    functionName: string,
    args: xdr.ScVal[],
  ): Promise<xdr.ScVal> {
    try {
      logger.info("Reading contract data", { contractId, functionName });

      const sourceAccount = stellarClient.getKeypair()?.publicKey();
      if (!sourceAccount) {
        throw new Error("No source account available for contract read");
      }

      const invokeOp = Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(contractId).toScAddress(),
            functionName: xdr.ScVal.scvSymbol(functionName).sym()!,
            args,
          }),
        ),
        auth: [],
      });

      const sourceAccountObj = await stellarClient.getAccount(sourceAccount);
      const builder = new TransactionBuilder(sourceAccountObj, {
        fee: await getBaseFee(),
        networkPassphrase: this.networkPassphrase,
      });
      builder.setTimeout(0);

      builder.addOperation(invokeOp);
      const transaction = builder.build();

      const rpcServer = new SorobanRpc.Server(stellarClient.getNetwork() === "mainnet" ? "https://soroban-mainnet.stellar.org" : "https://soroban-testnet.stellar.org");
      const simulation = await rpcServer.simulateTransaction(transaction);

      if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation error: ${simulation.error}`);
      }

      // If it's a success, it will have a result
      if (SorobanRpc.Api.isSimulationSuccess(simulation)) {
          return simulation.result!.retval;
      }
      
      throw new Error("Simulation neither error nor success");
    } catch (error) {
      logger.error("Failed to read contract", {
        contractId,
        functionName,
        error,
      });
      throw error;
    }
  }

  /**
   * Parse transaction result
   */
  private parseTransactionResult(result: any): xdr.ScVal {
    try {
      if (result.result_xdr) {
        const txResult = xdr.TransactionResult.fromXDR(
          result.result_xdr,
          "base64",
        );
        const results = txResult.result().results();
        if (results.length > 0) {
          const tr = results[0].tr();
          // Check for host function success
          const opResult = tr.invokeHostFunctionResult();
          if (
            opResult.switch() ===
            xdr.InvokeHostFunctionResultCode.invokeHostFunctionSuccess()
          ) {
            return opResult.success() as unknown as xdr.ScVal;
          }
        }
      }
      throw new Error("Could not parse transaction result");
    } catch (error) {
      logger.error("Failed to parse transaction result", { error });
      throw error;
    }
  }

  /**
   * Convert JavaScript value to ScVal
   */
  static toScVal(value: any): xdr.ScVal {
    if (typeof value === "string") {
      try {
        // Try to parse as Address if it looks like one
        if (/^[GC][A-Z2-7]{55}$/.test(value)) {
          return xdr.ScVal.scvAddress(Address.fromString(value).toScAddress());
        }
      } catch (e) {
        // Fallback to string if parsing fails
      }
      return xdr.ScVal.scvString(value);
    } else if (typeof value === "number" || typeof value === "bigint") {
      return ContractClient.bigIntToI128(BigInt(value));
    } else if (typeof value === "boolean") {
      return xdr.ScVal.scvBool(value);
    } else if (value instanceof Uint8Array) {
      return xdr.ScVal.scvBytes(Buffer.from(value));
    } else if (Array.isArray(value)) {
      const vec = value.map((v) => ContractClient.toScVal(v));
      return xdr.ScVal.scvVec(vec);
    } else {
      throw new Error(`Unsupported value type: ${typeof value}`);
    }
  }

  /**
   * Convert ScVal to JavaScript value
   */
  static fromScVal(scVal: xdr.ScVal): any {
    switch (scVal.switch()) {
      case xdr.ScValType.scvBool():
        return scVal.b();
      case xdr.ScValType.scvVoid():
        return null;
      case xdr.ScValType.scvU32():
        return scVal.u32();
      case xdr.ScValType.scvI32():
        return scVal.i32();
      case xdr.ScValType.scvU64():
        return scVal.u64().toBigInt().toString();
      case xdr.ScValType.scvI64():
        return scVal.i64().toBigInt().toString();
      case xdr.ScValType.scvU128():
      case xdr.ScValType.scvI128(): {
        const parts =
          scVal.switch() === xdr.ScValType.scvU128()
            ? scVal.u128()
            : scVal.i128();
        const lo = parts.lo().toBigInt();
        const hi = parts.hi().toBigInt();
        return (hi << BigInt(64)) | lo;
      }
      case xdr.ScValType.scvString():
        return scVal.str().toString();
      case xdr.ScValType.scvBytes():
        return scVal.bytes();
      case xdr.ScValType.scvVec():
        return (scVal.vec() ?? []).map((v: xdr.ScVal) =>
          ContractClient.fromScVal(v),
        );
      case xdr.ScValType.scvAddress():
        return Address.fromScVal(scVal).toString();
      default:
        return scVal;
    }
  }
}

export const contractClient = new ContractClient();
