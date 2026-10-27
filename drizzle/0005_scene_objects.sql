ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;

CREATE TABLE "scene_object" (
	"scene_id" text DEFAULT 'main-island' NOT NULL,
	"object_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"category" text NOT NULL,
	"region" text NOT NULL,
	"position_x" real NOT NULL,
	"position_y" real NOT NULL,
	"position_z" real NOT NULL,
	"rotation_x" real NOT NULL,
	"rotation_y" real NOT NULL,
	"rotation_z" real NOT NULL,
	"scale_x" real NOT NULL,
	"scale_y" real NOT NULL,
	"scale_z" real NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"collectible" boolean DEFAULT false NOT NULL,
	"auto_anchor" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "scene_object_scene_id_object_id_pk" PRIMARY KEY("scene_id","object_id"),
	CONSTRAINT "scene_object_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX "scene_object_scene_id_idx" ON "scene_object" USING btree ("scene_id");
