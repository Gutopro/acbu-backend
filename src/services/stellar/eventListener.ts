import { stellarClient } from "./client";
import { logger } from "../../config/logger";

export interface ContractEvent {
  contractId: string;
  type: string;
  data: any;
  ledger: number;
  timestamp: number;
}

export type EventHandler = (event: ContractEvent) => Promise<void>;

export class EventListener {
  private server: ReturnType<typeof stellarClient.getServer>;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private isListening: boolean = false;
  private cursor: string | null = null;
  private reconnectDelay: number = 5000;
  private maxReconnectDelay: number = 60000;

  constructor() {
    this.server = stellarClient.getServer();
  }

  /**
   * Register an event handler for a specific event type
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    logger.info("Event handler registered", { eventType });
  }

  /**
   * Remove an event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.info("Event handler removed", { eventType });
      }
    }
  }

  /**
   * Start listening for events
   */
  async start(cursor?: string): Promise<void> {
    if (this.isListening) {
      logger.warn("EventListener is already listening");
      return;
    }

    this.isListening = true;
    this.cursor = cursor || null;
    logger.info("Starting event listener", { cursor: this.cursor });

    await this.listen();
  }

  /**
   * Stop listening for events
   */
  stop(): void {
    this.isListening = false;
    logger.info("Stopped event listener");
  }

  /**
   * Listen for events from Horizon
   */
  private async listen(): Promise<void> {
    while (this.isListening) {
      try {
        const builder = this.server.effects().order("asc").limit(200);

        if (this.cursor) {
          builder.cursor(this.cursor);
        }

        const effects = await builder.call();

        for (const effect of effects.records) {
          // Process contract events
          if (
            effect.type === "contract" ||
            effect.type.startsWith("contract_")
          ) {
            await this.processEvent(effect);
          }

          // Update cursor
          this.cursor =
            (effect as { paging_token?: string }).paging_token ??
            (effect as { pagingToken?: () => string }).pagingToken?.() ??
            "";
        }

        // Small delay to avoid rate limiting
        await this.sleep(1000);
      } catch (error: any) {
        logger.error("Error listening for events", {
          error: error.message,
          cursor: this.cursor,
        });

        // Exponential backoff on error
        await this.sleep(this.reconnectDelay);
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay,
        );
      }
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(effect: any): Promise<void> {
    try {
      const event: ContractEvent = {
        contractId: effect.contract || "",
        type: effect.type,
        data: effect,
        ledger: effect.ledger || 0,
        timestamp: new Date(effect.created_at).getTime(),
      };

      // Call handlers for this event type
      const handlers = this.eventHandlers.get(event.type) || [];
      const allHandlers = this.eventHandlers.get("*") || [];

      for (const handler of [...handlers, ...allHandlers]) {
        try {
          await handler(event);
        } catch (error) {
          logger.error("Error in event handler", {
            eventType: event.type,
            error,
          });
        }
      }
    } catch (error) {
      logger.error("Error processing event", { error, effect });
    }
  }

  /**
   * Listen for specific contract events (MintEvent, BurnEvent, etc.)
   */
  async listenToContractEvents(
    contractId: string,
    eventTypes: string[],
    handler: EventHandler,
  ): Promise<void> {
    const contractHandler: EventHandler = async (event) => {
      if (event.contractId === contractId && eventTypes.includes(event.type)) {
        await handler(event);
      }
    };

    // Register handler for all events, filter in handler
    this.on("*", contractHandler);
  }

  /**
   * Get events for a specific contract
   */
  async getContractEvents(
    contractId: string,
    options?: {
      fromLedger?: number;
      toLedger?: number;
      limit?: number;
    },
  ): Promise<ContractEvent[]> {
    try {
      const builder = (
        this.server.effects() as unknown as {
          forContract: (id: string) => {
            ledger: (n: number) => unknown;
            limit: (n: number) => unknown;
            call: () => Promise<{ records: unknown[] }>;
          };
        }
      ).forContract(contractId);

      if (options?.fromLedger) {
        builder.ledger(options.fromLedger);
      }

      if (options?.limit) {
        builder.limit(options.limit);
      }

      const effects = await builder.call();
      const events: ContractEvent[] = [];

      for (const effect of effects.records as {
        type: string;
        ledger?: number;
        created_at: string;
        [k: string]: unknown;
      }[]) {
        events.push({
          contractId,
          type: effect.type,
          data: effect,
          ledger: effect.ledger || 0,
          timestamp: new Date(effect.created_at).getTime(),
        });
      }

      return events;
    } catch (error) {
      logger.error("Failed to get contract events", { contractId, error });
      throw error;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const eventListener = new EventListener();
