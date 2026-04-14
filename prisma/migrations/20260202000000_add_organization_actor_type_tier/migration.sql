-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255),
    "kyc_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "kyc_verified_at" TIMESTAMP,
    "actor_type" VARCHAR(20) NOT NULL DEFAULT 'sme',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_organization_kyc_status" ON "organizations"("kyc_status");

-- AlterTable (users: add actor_type, tier, organization_id)
ALTER TABLE "users" ADD COLUMN "actor_type" VARCHAR(20) NOT NULL DEFAULT 'retail';
ALTER TABLE "users" ADD COLUMN "tier" VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN "organization_id" UUID;

CREATE INDEX "idx_user_actor_type" ON "users"("actor_type");
CREATE INDEX "idx_user_organization_id" ON "users"("organization_id");

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable (api_keys: add organization_id)
ALTER TABLE "api_keys" ADD COLUMN "organization_id" UUID;

CREATE INDEX "idx_api_keys_organization_id" ON "api_keys"("organization_id");

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
