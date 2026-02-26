CREATE TABLE "webhook_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_url" text NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"webhook" text NOT NULL,
	"api_key" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_configs_server_url_unique" UNIQUE("server_url")
);
