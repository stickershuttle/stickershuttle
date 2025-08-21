-- Add creator_id column to promotional_containers table
-- This allows promotional containers to have a specific creator override
-- instead of relying only on collection-based creator detection

ALTER TABLE promotional_containers 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES creators(id) ON DELETE SET NULL;

-- Add index for better performance when querying by creator
CREATE INDEX IF NOT EXISTS idx_promotional_containers_creator_id 
ON promotional_containers(creator_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN promotional_containers.creator_id IS 'Optional creator override - if set, this creator will be displayed instead of auto-detecting from collection products';
