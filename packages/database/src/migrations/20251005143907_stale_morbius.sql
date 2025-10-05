CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TYPE "public"."gravedad" AS ENUM('low', 'intermediate', 'critical');--> statement-breakpoint
CREATE TYPE "public"."tipo_incidente" AS ENUM('fire', 'smoke', 'dust');--> statement-breakpoint
CREATE TABLE "airnow_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_forecast" date NOT NULL,
	"date_issue" date NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"reporting_area" varchar(100) NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"parameter_name" varchar(20) NOT NULL,
	"aqi" integer NOT NULL,
	"category_number" integer NOT NULL,
	"category_name" varchar(50) NOT NULL,
	"discussion" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "airnow_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_observed" date NOT NULL,
	"hour_observed" integer NOT NULL,
	"local_time_zone" varchar(10) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"reporting_area" varchar(100) NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"parameter_name" varchar(20) NOT NULL,
	"aqi" integer NOT NULL,
	"category_number" integer NOT NULL,
	"category_name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "airnow_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"reporting_area" varchar(100) NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"parameters" varchar(200) NOT NULL,
	"last_observation_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "firms_aggregations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregation_date" date NOT NULL,
	"bbox_west" double precision NOT NULL,
	"bbox_south" double precision NOT NULL,
	"bbox_east" double precision NOT NULL,
	"bbox_north" double precision NOT NULL,
	"source" varchar(50) NOT NULL,
	"total_fires" real NOT NULL,
	"average_frp" real NOT NULL,
	"max_frp" real NOT NULL,
	"total_frp" real NOT NULL,
	"confidence_high" real NOT NULL,
	"confidence_nominal" real NOT NULL,
	"confidence_low" real NOT NULL,
	"daytime_fires" real NOT NULL,
	"nighttime_fires" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "firms_fire_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"acq_date" date NOT NULL,
	"acq_time" time NOT NULL,
	"satellite" varchar(50) NOT NULL,
	"source" varchar(50) NOT NULL,
	"brightness" real NOT NULL,
	"frp" real NOT NULL,
	"confidence" varchar(20) NOT NULL,
	"daynight" varchar(1) NOT NULL,
	"version" varchar(10) NOT NULL,
	"additional_data" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "aq_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"parameter" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "aqi_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" integer NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"parameter" varchar(10) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(50) NOT NULL,
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
CREATE TABLE "user_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"latitud" numeric(10, 7) NOT NULL,
	"longitud" numeric(10, 7) NOT NULL,
	"descripcion" text,
	"gravedad" "gravedad" NOT NULL,
	"tipo" "tipo_incidente" NOT NULL,
	"fecha_reporte" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "airnow_fc_forecast_date_idx" ON "airnow_forecasts" USING btree ("date_forecast");--> statement-breakpoint
CREATE INDEX "airnow_fc_issue_date_idx" ON "airnow_forecasts" USING btree ("date_issue");--> statement-breakpoint
CREATE INDEX "airnow_fc_spatial_idx" ON "airnow_forecasts" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "airnow_fc_parameter_idx" ON "airnow_forecasts" USING btree ("parameter_name");--> statement-breakpoint
CREATE INDEX "airnow_fc_date_forecast_param_idx" ON "airnow_forecasts" USING btree ("date_forecast","parameter_name");--> statement-breakpoint
CREATE INDEX "airnow_obs_spatial_idx" ON "airnow_observations" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "airnow_obs_temporal_idx" ON "airnow_observations" USING btree ("date_observed","hour_observed");--> statement-breakpoint
CREATE INDEX "airnow_obs_parameter_idx" ON "airnow_observations" USING btree ("parameter_name");--> statement-breakpoint
CREATE INDEX "airnow_obs_date_param_state_idx" ON "airnow_observations" USING btree ("date_observed","parameter_name","state_code");--> statement-breakpoint
CREATE INDEX "airnow_obs_category_idx" ON "airnow_observations" USING btree ("category_number");--> statement-breakpoint
CREATE INDEX "airnow_stations_spatial_idx" ON "airnow_stations" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "airnow_stations_state_idx" ON "airnow_stations" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "airnow_stations_unique_location_idx" ON "airnow_stations" USING btree ("latitude","longitude","reporting_area");--> statement-breakpoint
CREATE INDEX "firms_agg_date_region_idx" ON "firms_aggregations" USING btree ("aggregation_date","source");--> statement-breakpoint
CREATE INDEX "firms_spatial_idx" ON "firms_fire_points" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "firms_temporal_idx" ON "firms_fire_points" USING btree ("acq_date","acq_time");--> statement-breakpoint
CREATE INDEX "firms_date_source_idx" ON "firms_fire_points" USING btree ("acq_date","satellite");--> statement-breakpoint
CREATE INDEX "firms_confidence_idx" ON "firms_fire_points" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "firms_frp_idx" ON "firms_fire_points" USING btree ("frp");--> statement-breakpoint
CREATE INDEX "aq_stations_location_idx" ON "aq_stations" USING gist ("location");--> statement-breakpoint
CREATE INDEX "aq_stations_provider_idx" ON "aq_stations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "aq_stations_parameter_idx" ON "aq_stations" USING btree ("parameter");--> statement-breakpoint
CREATE INDEX "aq_stations_provider_param_idx" ON "aq_stations" USING btree ("provider","parameter");--> statement-breakpoint
CREATE INDEX "aqi_meas_station_param_time_idx" ON "aqi_measurements" USING btree ("station_id","parameter","timestamp");--> statement-breakpoint
CREATE INDEX "aqi_meas_location_time_idx" ON "aqi_measurements" USING btree ("lat","lng","timestamp");--> statement-breakpoint
CREATE INDEX "aqi_meas_timestamp_idx" ON "aqi_measurements" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "aqi_meas_parameter_idx" ON "aqi_measurements" USING btree ("parameter");--> statement-breakpoint
CREATE UNIQUE INDEX "aqi_meas_unique_idx" ON "aqi_measurements" USING btree ("station_id","parameter","timestamp");--> statement-breakpoint
CREATE INDEX "alerts_location_idx" ON "alerts" USING gist ("location");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_urgency_idx" ON "alerts" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "alerts_type_idx" ON "alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "alerts_status_urgency_idx" ON "alerts" USING btree ("status","urgency");--> statement-breakpoint
CREATE INDEX "alerts_created_at_idx" ON "alerts" USING btree ("created_at");