


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."scan_status" AS ENUM (
    'queued',
    'running',
    'ok',
    'failed'
);


ALTER TYPE "public"."scan_status" OWNER TO "postgres";


CREATE TYPE "public"."token_category" AS ENUM (
    'colors',
    'typography',
    'spacing',
    'radii',
    'shadows',
    'motion',
    'breakpoint',
    'z-index',
    'misc'
);


ALTER TYPE "public"."token_category" OWNER TO "postgres";


CREATE TYPE "public"."workspace_plan" AS ENUM (
    'free',
    'pro',
    'team'
);


ALTER TYPE "public"."workspace_plan" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.app_users (id, email, full_name, avatar_url, github_login)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'user_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "github_login" "text",
    "github_installation_id" bigint,
    "default_theme" "text" DEFAULT 'dark'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repo_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "url" "text" NOT NULL,
    "checksum" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_repos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'github'::"text",
    "owner" "text" NOT NULL,
    "name" "text" NOT NULL,
    "default_branch" "text" DEFAULT 'main'::"text",
    "is_public" boolean DEFAULT true,
    "framework" "text",
    "last_scanned_sha" "text",
    "last_scanned_at" timestamp with time zone,
    "scan_status" "text" DEFAULT 'pending'::"text",
    "unsupported_reason" "text",
    "brand_profile" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_repos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_scan_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repo_id" "uuid",
    "event" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_scan_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "framework" "text",
    "repo" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_id" "uuid" NOT NULL,
    "repo_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "description" "text",
    "source_code" "text" NOT NULL,
    "render_config" "jsonb" NOT NULL,
    "dependencies" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "github_installation_id" bigint,
    "default_branch" "text" DEFAULT 'main'::"text" NOT NULL,
    "last_scan_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."repos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repo_id" "uuid" NOT NULL,
    "commit_sha" "text" NOT NULL,
    "status" "public"."scan_status" DEFAULT 'queued'::"public"."scan_status" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "error" "text",
    "payload" "jsonb",
    "file_count" integer,
    "component_count" integer,
    "token_count" integer
);


ALTER TABLE "public"."scans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_id" "uuid" NOT NULL,
    "repo_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "public"."token_category" NOT NULL,
    "value" "text" NOT NULL,
    "raw_value" "text" NOT NULL,
    "source_file" "text",
    "source_line" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "last_repo" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'autoDSM: last dashboard repo per authenticated user';



CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "plan" "public"."workspace_plan" DEFAULT 'free'::"public"."workspace_plan" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_repos"
    ADD CONSTRAINT "brand_repos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_repos"
    ADD CONSTRAINT "brand_repos_user_id_owner_name_key" UNIQUE ("user_id", "owner", "name");



ALTER TABLE ONLY "public"."brand_scan_logs"
    ADD CONSTRAINT "brand_scan_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_waitlist"
    ADD CONSTRAINT "brand_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_scan_id_slug_key" UNIQUE ("scan_id", "slug");



ALTER TABLE ONLY "public"."repos"
    ADD CONSTRAINT "repos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repos"
    ADD CONSTRAINT "repos_workspace_id_full_name_key" UNIQUE ("workspace_id", "full_name");



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_slug_key" UNIQUE ("slug");



CREATE INDEX "assets_repo_id_kind_idx" ON "public"."assets" USING "btree" ("repo_id", "kind");



CREATE INDEX "brand_repos_public_slug_idx" ON "public"."brand_repos" USING "btree" ("owner", "name") WHERE ("is_public" = true);



CREATE INDEX "components_repo_id_idx" ON "public"."components" USING "btree" ("repo_id");



CREATE INDEX "components_scan_id_idx" ON "public"."components" USING "btree" ("scan_id");



CREATE INDEX "repos_workspace_id_idx" ON "public"."repos" USING "btree" ("workspace_id");



CREATE INDEX "scans_repo_id_started_at_idx" ON "public"."scans" USING "btree" ("repo_id", "started_at" DESC);



CREATE INDEX "tokens_repo_id_category_idx" ON "public"."tokens" USING "btree" ("repo_id", "category");



CREATE INDEX "tokens_scan_id_idx" ON "public"."tokens" USING "btree" ("scan_id");



CREATE INDEX "workspaces_owner_id_idx" ON "public"."workspaces" USING "btree" ("owner_id");



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_repos"
    ADD CONSTRAINT "brand_repos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_scan_logs"
    ADD CONSTRAINT "brand_scan_logs_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "public"."brand_repos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repos"
    ADD CONSTRAINT "repos_last_scan_fk" FOREIGN KEY ("last_scan_id") REFERENCES "public"."scans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repos"
    ADD CONSTRAINT "repos_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scans"
    ADD CONSTRAINT "scans_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tokens"
    ADD CONSTRAINT "tokens_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assets_by_repo" ON "public"."assets" USING (("repo_id" IN ( SELECT "repos"."id"
   FROM "public"."repos"
  WHERE ("repos"."workspace_id" IN ( SELECT "workspaces"."id"
           FROM "public"."workspaces"
          WHERE ("workspaces"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."brand_repos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "brand_repos_owner_write" ON "public"."brand_repos" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "brand_repos_public_read" ON "public"."brand_repos" FOR SELECT TO "authenticated", "anon" USING ((("is_public" = true) OR ("auth"."uid"() = "user_id")));



ALTER TABLE "public"."brand_scan_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_waitlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."components" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "components_by_repo" ON "public"."components" USING (("repo_id" IN ( SELECT "repos"."id"
   FROM "public"."repos"
  WHERE ("repos"."workspace_id" IN ( SELECT "workspaces"."id"
           FROM "public"."workspaces"
          WHERE ("workspaces"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."repos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repos_by_workspace" ON "public"."repos" USING (("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"())))) WITH CHECK (("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"()))));



CREATE POLICY "scan_logs_owner_read" ON "public"."brand_scan_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."brand_repos" "r"
  WHERE (("r"."id" = "brand_scan_logs"."repo_id") AND ("r"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."scans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scans_by_repo" ON "public"."scans" USING (("repo_id" IN ( SELECT "repos"."id"
   FROM "public"."repos"
  WHERE ("repos"."workspace_id" IN ( SELECT "workspaces"."id"
           FROM "public"."workspaces"
          WHERE ("workspaces"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tokens_by_repo" ON "public"."tokens" USING (("repo_id" IN ( SELECT "repos"."id"
   FROM "public"."repos"
  WHERE ("repos"."workspace_id" IN ( SELECT "workspaces"."id"
           FROM "public"."workspaces"
          WHERE ("workspaces"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_preferences_insert_own" ON "public"."user_preferences" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_preferences_select_own" ON "public"."user_preferences" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_preferences_update_own" ON "public"."user_preferences" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_self_insert" ON "public"."app_users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_self_select" ON "public"."app_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "users_self_update" ON "public"."app_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "waitlist_anon_insert" ON "public"."brand_waitlist" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspaces_owner" ON "public"."workspaces" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_users" TO "anon";
GRANT ALL ON TABLE "public"."app_users" TO "authenticated";
GRANT ALL ON TABLE "public"."app_users" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."brand_repos" TO "anon";
GRANT ALL ON TABLE "public"."brand_repos" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_repos" TO "service_role";



GRANT ALL ON TABLE "public"."brand_scan_logs" TO "anon";
GRANT ALL ON TABLE "public"."brand_scan_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_scan_logs" TO "service_role";



GRANT ALL ON TABLE "public"."brand_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."brand_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."components" TO "anon";
GRANT ALL ON TABLE "public"."components" TO "authenticated";
GRANT ALL ON TABLE "public"."components" TO "service_role";



GRANT ALL ON TABLE "public"."repos" TO "anon";
GRANT ALL ON TABLE "public"."repos" TO "authenticated";
GRANT ALL ON TABLE "public"."repos" TO "service_role";



GRANT ALL ON TABLE "public"."scans" TO "anon";
GRANT ALL ON TABLE "public"."scans" TO "authenticated";
GRANT ALL ON TABLE "public"."scans" TO "service_role";



GRANT ALL ON TABLE "public"."tokens" TO "anon";
GRANT ALL ON TABLE "public"."tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."tokens" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "brand_repos_public_read" on "public"."brand_repos";

drop policy "waitlist_anon_insert" on "public"."brand_waitlist";


  create policy "brand_repos_public_read"
  on "public"."brand_repos"
  as permissive
  for select
  to anon, authenticated
using (((is_public = true) OR (auth.uid() = user_id)));



  create policy "waitlist_anon_insert"
  on "public"."brand_waitlist"
  as permissive
  for insert
  to anon, authenticated
with check (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


