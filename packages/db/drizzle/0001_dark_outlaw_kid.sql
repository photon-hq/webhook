ALTER TABLE "webhook_configs" ADD COLUMN "signing_secret" text NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_configs" DROP COLUMN "public_key";--> statement-breakpoint
ALTER TABLE "webhook_configs" DROP COLUMN "private_key";