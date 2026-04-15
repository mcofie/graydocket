-- Preview duplicate commission groups before cleanup.
SELECT
  application_id,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id ORDER BY
    CASE status
      WHEN 'paid' THEN 1
      WHEN 'approved' THEN 2
      WHEN 'pending' THEN 3
      WHEN 'void' THEN 4
      ELSE 5
    END,
    updated_at DESC NULLS LAST,
    created_at DESC NULLS LAST,
    id DESC
  ) AS commission_ids
FROM graydocket.commissions
GROUP BY application_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, application_id;

-- Delete all but the strongest commission row per application.
-- Priority kept:
-- 1. paid
-- 2. approved
-- 3. pending
-- 4. void
WITH ranked_commissions AS (
  SELECT
    id,
    application_id,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY application_id
      ORDER BY
        CASE status
          WHEN 'paid' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'pending' THEN 3
          WHEN 'void' THEN 4
          ELSE 5
        END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS row_rank
  FROM graydocket.commissions
)
DELETE FROM graydocket.commissions
WHERE id IN (
  SELECT id
  FROM ranked_commissions
  WHERE row_rank > 1
);

-- Confirm cleanup result.
SELECT
  COUNT(*) AS remaining_duplicate_groups
FROM (
  SELECT application_id
  FROM graydocket.commissions
  GROUP BY application_id
  HAVING COUNT(*) > 1
) duplicates;
