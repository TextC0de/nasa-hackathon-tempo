CREATE TABLE "aq_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"parameter" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "aq_stations_spatial_idx" ON "aq_stations" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "aq_stations_provider_idx" ON "aq_stations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "aq_stations_parameter_idx" ON "aq_stations" USING btree ("parameter");--> statement-breakpoint
CREATE INDEX "aq_stations_provider_param_idx" ON "aq_stations" USING btree ("provider","parameter");