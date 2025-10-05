CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"urgency" varchar(20) DEFAULT 'medium' NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"location_name" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"alert_type" varchar(50),
	"resolved_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "alerts_location_idx" ON "alerts" USING gist ("location");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_urgency_idx" ON "alerts" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "alerts_type_idx" ON "alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "alerts_status_urgency_idx" ON "alerts" USING btree ("status","urgency");--> statement-breakpoint
CREATE INDEX "alerts_created_at_idx" ON "alerts" USING btree ("created_at");