ALTER TABLE "webhook_configs" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
