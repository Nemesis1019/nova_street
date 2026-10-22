-- Usuario espejo por tenant para superadmins globales (PlatformUser).
ALTER TABLE "users" ADD COLUMN "platformUserId" UUID;

CREATE UNIQUE INDEX "users_platformUserId_key" ON "users"("platformUserId");
