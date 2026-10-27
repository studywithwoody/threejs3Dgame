DROP TABLE IF EXISTS "island_progress";

CREATE TABLE "user_progress" (
	"user_id" text PRIMARY KEY NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "user_question_progress" (
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"solved_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"earned_score" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_question_progress_user_id_question_id_pk" PRIMARY KEY("user_id","question_id"),
	CONSTRAINT "user_question_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "pet" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"last_fed_at" timestamp with time zone NOT NULL,
	"feedings" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "egg" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egg_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE "score_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "score_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX "pet_user_id_idx" ON "pet" USING btree ("user_id");
CREATE INDEX "egg_user_id_idx" ON "egg" USING btree ("user_id");
CREATE INDEX "score_transaction_user_id_idx" ON "score_transaction" USING btree ("user_id");
