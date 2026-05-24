DELETE FROM permission_policies
WHERE status = 'deleted';

DELETE FROM permission_policies
WHERE status = 'active'
  AND id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY agent_id, subject_type, subject_id
          ORDER BY updated_at DESC, created_at DESC, id DESC
        ) AS row_number
      FROM permission_policies
      WHERE status = 'active'
    )
    WHERE row_number > 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_policies_unique_active_subject
  ON permission_policies(agent_id, subject_type, subject_id)
  WHERE status = 'active';
