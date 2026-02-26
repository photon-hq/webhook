CREATE TABLE "webhook_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_url" text NOT NULL,
	"key" text NOT NULL,
	"webhook" text NOT NULL,
	CONSTRAINT "webhook_configs_server_url_unique" UNIQUE("server_url")
);
