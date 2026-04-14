-- AlterTable
ALTER TABLE "basket_metrics" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "stellarAddress" VARCHAR(56) NOT NULL,
    "kycStatus" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "kyc_verified_at" TIMESTAMP,
    "country_code" VARCHAR(3),
    "username" VARCHAR(64),
    "phone_e164" VARCHAR(20),
    "email" VARCHAR(255),
    "email_verified_at" TIMESTAMP,
    "phone_verified_at" TIMESTAMP,
    "privacy_hide_from_search" BOOLEAN NOT NULL DEFAULT true,
    "passcode_hash" VARCHAR(255),
    "encrypted_stellar_secret" VARCHAR(512),
    "key_encryption_hint" VARCHAR(50),
    "two_fa_method" VARCHAR(20),
    "totp_secret_encrypted" VARCHAR(512),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "usdc_amount" DECIMAL(20,8),
    "acbu_amount" DECIMAL(20,8),
    "acbu_amount_burned" DECIMAL(20,8),
    "local_currency" VARCHAR(3),
    "local_amount" DECIMAL(20,2),
    "recipient_account" JSONB,
    "recipient_address" VARCHAR(56),
    "fee" DECIMAL(20,8),
    "rate_snapshot" JSONB,
    "blockchain_tx_hash" VARCHAR(255),
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserves" (
    "id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "target_weight" DECIMAL(5,2) NOT NULL,
    "actual_weight" DECIMAL(5,2) NOT NULL,
    "reserve_amount" DECIMAL(20,2) NOT NULL,
    "reserve_value_usd" DECIMAL(20,2) NOT NULL,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserve_history" (
    "id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "amount_change" DECIMAL(20,2) NOT NULL,
    "reason" VARCHAR(100),
    "transaction_id" UUID,
    "previous_amount" DECIMAL(20,2),
    "new_amount" DECIMAL(20,2),
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserve_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oracle_rates" (
    "id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "rate_usd" DECIMAL(20,8) NOT NULL,
    "central_bank_rate" DECIMAL(20,8),
    "fintech_rate" DECIMAL(20,8),
    "forex_rate" DECIMAL(20,8),
    "median_rate" DECIMAL(20,8) NOT NULL,
    "twap_24h" DECIMAL(20,8),
    "validator_signatures" JSONB,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oracle_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acbu_rates" (
    "id" UUID NOT NULL,
    "acbu_usd" DECIMAL(20,8) NOT NULL,
    "acbu_eur" DECIMAL(20,8),
    "acbu_gbp" DECIMAL(20,8),
    "acbu_ngn" DECIMAL(20,2),
    "acbu_kes" DECIMAL(20,2),
    "acbu_zar" DECIMAL(20,2),
    "acbu_rwf" DECIMAL(20,2),
    "acbu_ghs" DECIMAL(20,2),
    "acbu_egp" DECIMAL(20,2),
    "acbu_mad" DECIMAL(20,2),
    "acbu_tzs" DECIMAL(20,2),
    "acbu_ugx" DECIMAL(20,2),
    "acbu_xof" DECIMAL(20,2),
    "change_24h_usd" DECIMAL(5,2),
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acbu_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalancing_events" (
    "id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "adjustments" JSONB,
    "started_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP,

    CONSTRAINT "rebalancing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trail" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "performed_by" UUID,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL,
    "transaction_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "key_hash" VARCHAR(255) NOT NULL,
    "permissions" JSONB,
    "rate_limit" INTEGER NOT NULL DEFAULT 100,
    "last_used_at" TIMESTAMP,
    "expires_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_passkeys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credential_id" VARCHAR(512) NOT NULL,
    "public_key" TEXT NOT NULL,
    "device_name" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "guardian_user_id" UUID,
    "guardian_email" VARCHAR(255),
    "guardian_phone" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "order" SMALLINT NOT NULL DEFAULT 0,
    "invited_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "contact_user_id" UUID,
    "contact_username" VARCHAR(64),
    "contact_phone_e164" VARCHAR(20),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "used_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "fee_paid_acbu" DECIMAL(20,8) NOT NULL,
    "fee_tx_hash" VARCHAR(255),
    "fee_mint_transaction_id" UUID,
    "machine_confidence" DECIMAL(3,2),
    "machine_redacted_payload" JSONB,
    "machine_extracted_payload" JSONB,
    "rejection_reason" VARCHAR(500),
    "resolved_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "kyc_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "storage_ref" VARCHAR(512) NOT NULL,
    "checksum" VARCHAR(64),
    "mime_type" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_validators" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "country_code" VARCHAR(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "accuracy_score" DECIMAL(3,2) NOT NULL DEFAULT 1,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "agreement_accepted_at" TIMESTAMP,
    "training_completed_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "kyc_validators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_validations" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "validator_id" UUID NOT NULL,
    "result" VARCHAR(20) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_validator_rewards" (
    "id" UUID NOT NULL,
    "validator_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "acbu_amount" DECIMAL(20,8) NOT NULL,
    "tx_hash" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_validator_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_stellarAddress_key" ON "users"("stellarAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_stellar_address" ON "users"("stellarAddress");

-- CreateIndex
CREATE INDEX "idx_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_phone_e164" ON "users"("phone_e164");

-- CreateIndex
CREATE INDEX "idx_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_transactions_user_id" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_transactions_type" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "idx_transactions_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_transactions_created_at" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_transactions_user_type" ON "transactions"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_transactions_status_created" ON "transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_reserves_currency" ON "reserves"("currency");

-- CreateIndex
CREATE INDEX "idx_reserves_timestamp" ON "reserves"("timestamp");

-- CreateIndex
CREATE INDEX "idx_reserves_currency_timestamp" ON "reserves"("currency", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reserves_currency_timestamp_key" ON "reserves"("currency", "timestamp");

-- CreateIndex
CREATE INDEX "idx_reserve_history_currency" ON "reserve_history"("currency");

-- CreateIndex
CREATE INDEX "idx_reserve_history_timestamp" ON "reserve_history"("timestamp");

-- CreateIndex
CREATE INDEX "idx_reserve_history_transaction_id" ON "reserve_history"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_oracle_rates_currency" ON "oracle_rates"("currency");

-- CreateIndex
CREATE INDEX "idx_oracle_rates_timestamp" ON "oracle_rates"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "oracle_rates_currency_timestamp_key" ON "oracle_rates"("currency", "timestamp");

-- CreateIndex
CREATE INDEX "idx_acbu_rates_timestamp" ON "acbu_rates"("timestamp");

-- CreateIndex
CREATE INDEX "idx_rebalancing_events_type" ON "rebalancing_events"("type");

-- CreateIndex
CREATE INDEX "idx_rebalancing_events_status" ON "rebalancing_events"("status");

-- CreateIndex
CREATE INDEX "idx_rebalancing_events_started_at" ON "rebalancing_events"("started_at");

-- CreateIndex
CREATE INDEX "idx_audit_trail_event_type" ON "audit_trail"("event_type");

-- CreateIndex
CREATE INDEX "idx_audit_trail_entity_type" ON "audit_trail"("entity_type");

-- CreateIndex
CREATE INDEX "idx_audit_trail_entity_id" ON "audit_trail"("entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_trail_timestamp" ON "audit_trail"("timestamp");

-- CreateIndex
CREATE INDEX "idx_webhooks_transaction_id" ON "webhooks"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_webhooks_status" ON "webhooks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "idx_api_keys_user_id" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "idx_api_keys_key_hash" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "user_passkeys_credential_id_key" ON "user_passkeys"("credential_id");

-- CreateIndex
CREATE INDEX "idx_user_passkey_user_id" ON "user_passkeys"("user_id");

-- CreateIndex
CREATE INDEX "idx_guardian_user_id" ON "guardians"("user_id");

-- CreateIndex
CREATE INDEX "idx_guardian_guardian_user_id" ON "guardians"("guardian_user_id");

-- CreateIndex
CREATE INDEX "idx_user_contact_user_id" ON "user_contacts"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_contact_contact_user_id" ON "user_contacts"("contact_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_contacts_user_id_contact_user_id_key" ON "user_contacts"("user_id", "contact_user_id");

-- CreateIndex
CREATE INDEX "idx_otp_challenge_user_id" ON "otp_challenges"("user_id");

-- CreateIndex
CREATE INDEX "idx_otp_challenge_expires_at" ON "otp_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "idx_kyc_application_user_id" ON "kyc_applications"("user_id");

-- CreateIndex
CREATE INDEX "idx_kyc_application_status" ON "kyc_applications"("status");

-- CreateIndex
CREATE INDEX "idx_kyc_application_country" ON "kyc_applications"("country_code");

-- CreateIndex
CREATE INDEX "idx_kyc_application_created_at" ON "kyc_applications"("created_at");

-- CreateIndex
CREATE INDEX "idx_kyc_document_application_id" ON "kyc_documents"("application_id");

-- CreateIndex
CREATE INDEX "idx_kyc_validator_country" ON "kyc_validators"("country_code");

-- CreateIndex
CREATE INDEX "idx_kyc_validator_status" ON "kyc_validators"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_validators_user_id_country_code_key" ON "kyc_validators"("user_id", "country_code");

-- CreateIndex
CREATE INDEX "idx_kyc_validation_application_id" ON "kyc_validations"("application_id");

-- CreateIndex
CREATE INDEX "idx_kyc_validation_validator_id" ON "kyc_validations"("validator_id");

-- CreateIndex
CREATE INDEX "idx_kyc_validator_reward_validator_id" ON "kyc_validator_rewards"("validator_id");

-- CreateIndex
CREATE INDEX "idx_kyc_validator_reward_application_id" ON "kyc_validator_rewards"("application_id");

-- CreateIndex
CREATE INDEX "idx_kyc_validator_reward_status" ON "kyc_validator_rewards"("status");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserve_history" ADD CONSTRAINT "reserve_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_passkeys" ADD CONSTRAINT "user_passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_contact_user_id_fkey" FOREIGN KEY ("contact_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_applications" ADD CONSTRAINT "kyc_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_validators" ADD CONSTRAINT "kyc_validators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_validations" ADD CONSTRAINT "kyc_validations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_validations" ADD CONSTRAINT "kyc_validations_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "kyc_validators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_validator_rewards" ADD CONSTRAINT "kyc_validator_rewards_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "kyc_validators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_validator_rewards" ADD CONSTRAINT "kyc_validator_rewards_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "kyc_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
