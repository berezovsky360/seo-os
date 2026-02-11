-- Telegraph Module: Publish articles to telegra.ph
-- Accounts store access tokens, pages track published content

-- ═══════════════════════════════════════════════════════════
-- 1. Telegraph Accounts
-- ═══════════════════════════════════════════════════════════

CREATE TABLE telegraph_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    short_name TEXT NOT NULL,
    author_name TEXT,
    author_url TEXT,
    access_token TEXT NOT NULL,
    page_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE telegraph_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own telegraph accounts"
    ON telegraph_accounts FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_telegraph_accounts_user ON telegraph_accounts(user_id);

-- ═══════════════════════════════════════════════════════════
-- 2. Telegraph Pages
-- ═══════════════════════════════════════════════════════════

CREATE TABLE telegraph_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES telegraph_accounts(id) ON DELETE CASCADE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    source_article_id UUID,
    source_item_id UUID,
    views INTEGER DEFAULT 0,
    last_views_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE telegraph_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own telegraph pages"
    ON telegraph_pages FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_telegraph_pages_user ON telegraph_pages(user_id, created_at DESC);
CREATE INDEX idx_telegraph_pages_account ON telegraph_pages(account_id);
CREATE INDEX idx_telegraph_pages_site ON telegraph_pages(site_id);
