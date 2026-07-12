ALTER TABLE "voice_sessions"
ADD COLUMN "end_reason" TEXT,
ADD COLUMN "coverage_snapshot" JSONB,
ADD COLUMN "probe_card_version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "voice_coverage_states" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_coverage_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voice_evidence" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "turn_id" TEXT,
    "dimension" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "confidence_delta" DOUBLE PRECISION NOT NULL,
    "card_id" TEXT NOT NULL,
    "card_version" INTEGER NOT NULL,
    "option_id" TEXT,
    "option_mapping_version" INTEGER NOT NULL,
    "source_question_ids" JSONB NOT NULL,
    "target_dimensions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "supersedes_evidence_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voice_coverage_states_user_id_key" ON "voice_coverage_states"("user_id");
CREATE INDEX "voice_evidence_user_id_dimension_created_at_idx" ON "voice_evidence"("user_id", "dimension", "created_at");
CREATE INDEX "voice_evidence_session_id_created_at_idx" ON "voice_evidence"("session_id", "created_at");

ALTER TABLE "voice_coverage_states"
ADD CONSTRAINT "voice_coverage_states_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "voice_evidence"
ADD CONSTRAINT "voice_evidence_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "voice_evidence"
ADD CONSTRAINT "voice_evidence_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "voice_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "voice_evidence"
ADD CONSTRAINT "voice_evidence_turn_id_fkey"
FOREIGN KEY ("turn_id") REFERENCES "dialogue_turns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
