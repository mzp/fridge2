ALTER TABLE "pantry_items" ADD COLUMN "_new_id" integer GENERATED ALWAYS AS IDENTITY (sequence name "pantry_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "pantry_items" DROP CONSTRAINT "pantry_items_pkey";--> statement-breakpoint
ALTER TABLE "pantry_items" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "pantry_items" RENAME COLUMN "_new_id" TO "id";--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id");
