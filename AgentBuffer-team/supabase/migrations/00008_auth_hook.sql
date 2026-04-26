-- Custom Access Token Auth Hook.
-- On every JWT issuance, ensure the user has an org and embed org_id in app_metadata.
-- Per CLAUDE.md decision (2026-04-24): this replaces the brittle auth.users trigger pattern.
--
-- AFTER RUNNING THIS MIGRATION you must enable the hook in the Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token → enable, select public.custom_access_token_hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    uid UUID := (event->>'user_id')::UUID;
    oid UUID;
    oname TEXT;
BEGIN
    -- Reuse existing org if user already has one stored in metadata.
    SELECT
        NULLIF(raw_user_meta_data->>'org_id', '')::UUID,
        raw_user_meta_data->>'org_name'
    INTO oid, oname
    FROM auth.users
    WHERE id = uid;

    -- Bootstrap a new org on first JWT issue.
    IF oid IS NULL THEN
        INSERT INTO public.organizations (name)
            VALUES (COALESCE(NULLIF(oname, ''), 'My Workspace'))
            RETURNING id INTO oid;

        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::JSONB)
                                 || jsonb_build_object('org_id', oid::TEXT)
        WHERE id = uid;
    END IF;

    -- Embed in JWT.
    RETURN jsonb_set(event, '{claims,app_metadata,org_id}', to_jsonb(oid::TEXT));
END;
$$;

-- Permissions per Supabase Auth Hook docs.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated, anon, public;
GRANT SELECT, INSERT ON public.organizations TO supabase_auth_admin;
GRANT UPDATE (raw_user_meta_data) ON auth.users TO supabase_auth_admin;
