CREATE TABLE "aqi_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"parameter" varchar(10) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(20) NOT NULL,
	"aqi" integer NOT NULL,
	"category" integer NOT NULL,
	"site_name" varchar(255),
	"agency_name" varchar(255),
	"provider" varchar(50) DEFAULT 'airnow' NOT NULL,
	"quality_flag" varchar(10),
	"raw_concentration" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "aqi_meas_station_param_time_idx" ON "aqi_measurements" USING btree ("station_id","parameter","timestamp");--> statement-breakpoint
CREATE INDEX "aqi_meas_location_time_idx" ON "aqi_measurements" USING btree ("lat","lng","timestamp");--> statement-breakpoint
CREATE INDEX "aqi_meas_timestamp_idx" ON "aqi_measurements" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "aqi_meas_parameter_idx" ON "aqi_measurements" USING btree ("parameter");--> statement-breakpoint
CREATE UNIQUE INDEX "aqi_meas_unique_idx" ON "aqi_measurements" USING btree ("station_id","parameter","timestamp");