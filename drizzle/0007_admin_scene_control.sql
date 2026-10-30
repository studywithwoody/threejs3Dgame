CREATE TABLE "scene_layout_draft" (
  "scene_id" text PRIMARY KEY NOT NULL,
  "objects" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text,
  CONSTRAINT "scene_layout_draft_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE "homepage_scene_setting" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "scene_id" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text,
  CONSTRAINT "homepage_scene_setting_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);
