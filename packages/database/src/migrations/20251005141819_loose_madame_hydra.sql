CREATE TYPE "public"."gravedad" AS ENUM('low', 'intermediate', 'critical');--> statement-breakpoint
CREATE TYPE "public"."tipo_incidente" AS ENUM('fire', 'smoke', 'dust');--> statement-breakpoint
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
