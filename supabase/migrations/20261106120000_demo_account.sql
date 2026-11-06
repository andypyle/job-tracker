-- The public demo account: any user whose app_metadata has "demo": true. Only the service role
-- can set app_metadata, so a user can't make themselves one, or stop being one.
--
-- Production setup, once: create the user (dashboard or admin API, email confirmed), then
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"demo": true}' WHERE email = '…';
--   SELECT public.reset_demo_data();
-- To change its credentials later, set "demo" to false first: the guard below undoes changes while it's true.


-- ------------------------------------------------------------
-- reset_demo_data(): puts every demo account back to the sample data. The backend calls it nightly
-- (before the Unlikely move) and seed.sql calls it locally. Dates are relative to now(), so the
-- data stays current; one Applied row is 20 days old, so the nightly move picks it up.
-- Companies and URLs are fictional; the one logo URL uses the reserved .invalid domain so the
-- initials fallback shows. Uploads are off for demo accounts, so there are no files to remove.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS integer AS $$
DECLARE
  demo_id uuid;
  reset_count integer := 0;
BEGIN
  FOR demo_id IN
    SELECT id FROM auth.users WHERE (raw_app_meta_data ->> 'demo')::boolean IS TRUE
  LOOP
    -- Status history goes with its applications (ON DELETE CASCADE)
    DELETE FROM public.applications WHERE user_id = demo_id;
    DELETE FROM public.user_settings WHERE user_id = demo_id;

    -- Every status, plus a referral, notes, a broken logo and a stale Applied row.
    -- History joins on company; a NULL old_status marks creation, and the Unlikely move is
    -- automatic, as the nightly job records it.
    WITH inserted AS (
      INSERT INTO public.applications (
        user_id, job_post_url, job_title, company, company_logo_url, industry,
        compensation, is_referral, date_applied, status, notes, created_at
      )
      SELECT demo_id, a.job_post_url, a.job_title, a.company, a.company_logo_url, a.industry,
        a.compensation, a.is_referral, current_date - a.days_ago, a.status::public.application_status, a.notes, now() - make_interval(days => a.days_ago)
      FROM (VALUES
        ('https://jobs.example.com/northwind-labs/senior-product-designer', 'Senior Product Designer', 'Northwind Labs',
         NULL, 'Software', '$150k - $170k', true, 3, 'Applied',
         'Referred by a former teammate. Follow up after a week.'),
        ('https://jobs.example.com/halcyon-health/frontend-engineer', 'Frontend Engineer', 'Halcyon Health',
         NULL, 'Healthcare', '$130k - $150k', false, 8, 'Applied', NULL),
        ('https://jobs.example.com/brightline-transit/ux-engineer', 'UX Engineer', 'Brightline Transit',
         NULL, 'Transportation', NULL, false, 20, 'Applied', NULL),
        ('https://jobs.example.com/fernway/design-engineer', 'Design Engineer', 'Fernway',
         NULL, 'Software', '$140k - $160k', false, 18, 'Interviewing', NULL),
        ('https://jobs.example.com/quarry-analytics/senior-frontend-engineer', 'Senior Frontend Engineer', 'Quarry Analytics',
         'https://logos.example.invalid/quarry-analytics.png', 'Data and analytics', '$165k - $185k', false, 12, 'Interviewing',
         'Technical screen went well; take-home due Friday.'),
        ('https://jobs.example.com/lumen-and-co/product-designer', 'Product Designer', 'Lumen & Co',
         NULL, 'Retail', '$125k - $140k', true, 40, 'Offer', NULL),
        ('https://jobs.example.com/tidewater-bank/ui-engineer', 'UI Engineer', 'Tidewater Bank',
         NULL, 'Finance', '$120k - $135k', false, 35, 'Rejected', NULL),
        ('https://jobs.example.com/orchard-games/frontend-developer', 'Frontend Developer', 'Orchard Games',
         NULL, 'Gaming', '$55/hr', false, 25, 'Rejected', NULL),
        ('https://jobs.example.com/kestrel-robotics/design-systems-engineer', 'Design Systems Engineer', 'Kestrel Robotics',
         NULL, 'Robotics', '$155k - $175k', false, 45, 'Role Eliminated', NULL),
        ('https://jobs.example.com/saltmarsh-media/web-developer', 'Web Developer', 'Saltmarsh Media',
         NULL, 'Media', NULL, false, 50, 'Unlikely', NULL)
      ) AS a (job_post_url, job_title, company, company_logo_url, industry, compensation, is_referral, days_ago, status, notes)
      RETURNING id, company
    )
    INSERT INTO public.application_status_history (application_id, user_id, old_status, new_status, changed_at, is_automatic)
    SELECT inserted.id, demo_id, h.old_status, h.new_status, now() - make_interval(days => h.days_ago), h.is_automatic
    FROM (VALUES
      ('Northwind Labs',     NULL,           'Applied',          3, false),
      ('Halcyon Health',     NULL,           'Applied',          8, false),
      ('Brightline Transit', NULL,           'Applied',         20, false),
      ('Fernway',            NULL,           'Applied',         18, false),
      ('Fernway',            'Applied',      'Interviewing',    10, false),
      ('Quarry Analytics',   NULL,           'Applied',         12, false),
      ('Quarry Analytics',   'Applied',      'Interviewing',     5, false),
      ('Lumen & Co',         NULL,           'Applied',         40, false),
      ('Lumen & Co',         'Applied',      'Interviewing',    30, false),
      ('Lumen & Co',         'Interviewing', 'Offer',            7, false),
      ('Tidewater Bank',     NULL,           'Applied',         35, false),
      ('Tidewater Bank',     'Applied',      'Rejected',        21, false),
      ('Orchard Games',      NULL,           'Applied',         25, false),
      ('Orchard Games',      'Applied',      'Interviewing',    18, false),
      ('Orchard Games',      'Interviewing', 'Rejected',         9, false),
      ('Kestrel Robotics',   NULL,           'Applied',         45, false),
      ('Kestrel Robotics',   'Applied',      'Interviewing',    38, false),
      ('Kestrel Robotics',   'Interviewing', 'Role Eliminated', 30, false),
      ('Saltmarsh Media',    NULL,           'Applied',         50, false),
      ('Saltmarsh Media',    'Applied',      'Unlikely',        36, true)
    ) AS h (company, old_status, new_status, days_ago, is_automatic)
    JOIN inserted USING (company);

    reset_count := reset_count + 1;
  END LOOP;

  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Only the backend's service role resets demo data; Supabase grants new functions to everyone
REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO service_role;


-- ------------------------------------------------------------
-- The guard: the demo's sign-in details and profile can't change while it's flagged, whoever
-- asks. Settings hides those forms, but supabase.auth.updateUser() is one devtools call away.
-- Changes are undone rather than refused, so Auth's own updates (a password rehash at sign-in,
-- say) never fail a sign-in. Deleting the account is refused by the backend (DELETE /account).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.keep_demo_user_fixed()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.raw_app_meta_data ->> 'demo')::boolean IS TRUE
    AND (NEW.raw_app_meta_data ->> 'demo')::boolean IS TRUE THEN
    NEW.email := OLD.email;
    NEW.email_change := OLD.email_change;
    NEW.email_change_token_new := OLD.email_change_token_new;
    NEW.email_change_token_current := OLD.email_change_token_current;
    NEW.encrypted_password := OLD.encrypted_password;
    NEW.phone := OLD.phone;
    NEW.phone_change := OLD.phone_change;
    NEW.raw_user_meta_data := OLD.raw_user_meta_data;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.keep_demo_user_fixed() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER keep_demo_user_fixed
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.keep_demo_user_fixed();
