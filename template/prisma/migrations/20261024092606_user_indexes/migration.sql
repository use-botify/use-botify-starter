-- CreateIndex
CREATE INDEX "user_isActive_id_idx" ON "user"("isActive", "id");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");
