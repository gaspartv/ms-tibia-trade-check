CREATE TABLE "coin_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"sent_by" varchar(255) NOT NULL,
	"amount_tibia_coins" integer NOT NULL,
	"timestamp" bigint NOT NULL,
	"id_transaction" varchar(255) NOT NULL,
	CONSTRAINT "coin_transactions_id_transaction_unique" UNIQUE("id_transaction")
);
