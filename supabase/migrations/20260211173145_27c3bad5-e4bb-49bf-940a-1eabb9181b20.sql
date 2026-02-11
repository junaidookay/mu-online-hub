
-- Add slug and extended fields to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS long_description text;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS discord_link text;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS voting_enabled boolean DEFAULT true;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add slug to advertisements table
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create server_votes table
CREATE TABLE public.server_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  vote_month integer NOT NULL,
  vote_year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, server_id, vote_month, vote_year)
);

-- Enable RLS
ALTER TABLE public.server_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for server_votes
CREATE POLICY "Anyone can view vote counts"
  ON public.server_votes FOR SELECT
  USING (true);

CREATE POLICY "Logged-in users can vote"
  ON public.server_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON public.server_votes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all votes"
  ON public.server_votes FOR ALL
  USING (is_admin());

-- Create index for fast ranking queries
CREATE INDEX idx_server_votes_monthly ON public.server_votes (server_id, vote_month, vote_year);
CREATE INDEX idx_server_votes_user ON public.server_votes (user_id, vote_month, vote_year);

-- Enable realtime for server_votes
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_votes;

-- Generate slugs for existing servers
UPDATE public.servers SET slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', ''), ',', '')) || '-' || LEFT(id::text, 8) WHERE slug IS NULL;

-- Generate slugs for existing advertisements
UPDATE public.advertisements SET slug = LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '.', ''), ',', '')) || '-' || LEFT(id::text, 8) WHERE slug IS NULL;
