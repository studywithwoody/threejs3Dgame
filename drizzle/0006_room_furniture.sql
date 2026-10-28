CREATE TABLE "furniture_inventory" (
  "user_id" text NOT NULL,
  "asset_id" text NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "furniture_inventory_user_id_asset_id_pk" PRIMARY KEY("user_id", "asset_id"),
  CONSTRAINT "furniture_inventory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade
);

CREATE TABLE "room_furniture" (
  "user_id" text NOT NULL,
  "object_id" text NOT NULL,
  "asset_id" text NOT NULL,
  "position_x" real NOT NULL,
  "position_y" real NOT NULL,
  "position_z" real NOT NULL,
  "rotation_x" real NOT NULL,
  "rotation_y" real NOT NULL,
  "rotation_z" real NOT NULL,
  "scale_x" real NOT NULL,
  "scale_y" real NOT NULL,
  "scale_z" real NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "room_furniture_user_id_object_id_pk" PRIMARY KEY("user_id", "object_id"),
  CONSTRAINT "room_furniture_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade
);
