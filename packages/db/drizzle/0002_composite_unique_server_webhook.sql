ALTER TABLE "webhook_configs" DROP CONSTRAINT "webhook_configs_server_url_unique";--> statement-breakpoint
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_server_url_webhook_unique" UNIQUE("server_url","webhook");
