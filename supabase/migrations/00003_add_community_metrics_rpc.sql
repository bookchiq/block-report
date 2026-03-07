-- RPC function to aggregate 311 metrics for a community server-side.
-- This avoids Supabase's default 1,000-row limit by computing all
-- aggregates in Postgres and returning a single JSONB result.

CREATE OR REPLACE FUNCTION get_community_metrics(community_name TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  cleaned TEXT;
BEGIN
  cleaned := replace(replace(community_name, '%', ''), '_', '');

  SELECT jsonb_build_object(
    'total_requests', COALESCE(agg.total, 0),
    'resolved_count', COALESCE(agg.resolved, 0),
    'avg_days_to_resolve', COALESCE(ROUND(agg.avg_days::numeric, 1), 0),
    'top_issues', COALESCE(ti.items, '[]'::jsonb),
    'recently_resolved', COALESCE(rr.items, '[]'::jsonb),
    'recent_resolved_90d', COALESCE(r90.cnt, 0),
    'top_recent_category', r90.top_cat,
    'top_recent_category_count', COALESCE(r90.top_cat_cnt, 0),
    'high_res_categories', COALESCE(hrc.items, '[]'::jsonb),
    'population', COALESCE(pop.total, 0)
  ) INTO result
  FROM
    -- Basic aggregates
    (SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'Closed' OR date_closed IS NOT NULL) AS resolved,
      AVG(EXTRACT(EPOCH FROM (date_closed - date_requested)) / 86400)
        FILTER (WHERE date_closed IS NOT NULL AND date_requested IS NOT NULL
                AND date_closed >= date_requested) AS avg_days
    FROM requests_311
    WHERE LOWER(comm_plan_name) = LOWER(cleaned)
    ) agg,

    -- Top 10 issues by service_name
    LATERAL (
      SELECT jsonb_agg(row_to_json(t)::jsonb) AS items FROM (
        SELECT service_name AS category, COUNT(*) AS count
        FROM requests_311
        WHERE LOWER(comm_plan_name) = LOWER(cleaned)
        GROUP BY service_name
        ORDER BY count DESC
        LIMIT 10
      ) t
    ) ti,

    -- Last 5 recently resolved
    LATERAL (
      SELECT jsonb_agg(row_to_json(t)::jsonb) AS items FROM (
        SELECT service_name AS category, date_closed AS date
        FROM requests_311
        WHERE LOWER(comm_plan_name) = LOWER(cleaned)
          AND date_closed IS NOT NULL
          AND (status = 'Closed' OR date_closed IS NOT NULL)
        ORDER BY date_closed DESC
        LIMIT 5
      ) t
    ) rr,

    -- Resolved in last 90 days + top category
    LATERAL (
      SELECT
        cnt,
        top_cat,
        top_cat_cnt
      FROM (
        SELECT COUNT(*) AS cnt
        FROM requests_311
        WHERE LOWER(comm_plan_name) = LOWER(cleaned)
          AND (status = 'Closed' OR date_closed IS NOT NULL)
          AND date_closed >= NOW() - INTERVAL '90 days'
      ) c,
      LATERAL (
        SELECT service_name AS top_cat, COUNT(*) AS top_cat_cnt
        FROM requests_311
        WHERE LOWER(comm_plan_name) = LOWER(cleaned)
          AND (status = 'Closed' OR date_closed IS NOT NULL)
          AND date_closed >= NOW() - INTERVAL '90 days'
        GROUP BY service_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ) tc
    ) r90,

    -- Categories with >= 90% resolution rate and >= 10 reports
    LATERAL (
      SELECT jsonb_agg(row_to_json(t)::jsonb) AS items FROM (
        SELECT
          service_name AS category,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'Closed' OR date_closed IS NOT NULL) AS resolved,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'Closed' OR date_closed IS NOT NULL)::numeric
            / COUNT(*)::numeric * 100
          ) AS resolution_rate
        FROM requests_311
        WHERE LOWER(comm_plan_name) = LOWER(cleaned)
        GROUP BY service_name
        HAVING COUNT(*) >= 10
          AND COUNT(*) FILTER (WHERE status = 'Closed' OR date_closed IS NOT NULL)::numeric
              / COUNT(*)::numeric >= 0.9
        ORDER BY COUNT(*) FILTER (WHERE status = 'Closed' OR date_closed IS NOT NULL)::numeric
              / COUNT(*)::numeric DESC
      ) t
    ) hrc,

    -- Population from census
    LATERAL (
      SELECT COALESCE(SUM(total_pop_5plus), 0) AS total
      FROM census_language
      WHERE LOWER(community) = LOWER(cleaned)
    ) pop;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Allow anon to call this function
GRANT EXECUTE ON FUNCTION get_community_metrics(TEXT) TO anon;
