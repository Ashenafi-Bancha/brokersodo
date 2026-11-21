-- Full-text search vector for listings (English stemming + 'simple' for Amharic/ref codes)
CREATE OR REPLACE FUNCTION listing_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."refCode", '')), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(NEW."titleEn", ''))), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."titleAm", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."addressHint", '')), 'B') ||
    setweight(to_tsvector('english', unaccent(coalesce(
      (SELECT string_agg(value, ' ') FROM jsonb_each_text(coalesce(NEW."attributes", '{}'::jsonb))), ''))), 'B') ||
    setweight(to_tsvector('english', unaccent(regexp_replace(coalesce(NEW."descriptionEn", ''), '<[^>]+>', ' ', 'g'))), 'C') ||
    setweight(to_tsvector('simple', regexp_replace(coalesce(NEW."descriptionAm", ''), '<[^>]+>', ' ', 'g')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listing_search_vector_trigger ON "Listing";
CREATE TRIGGER listing_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "refCode", "titleEn", "titleAm", "addressHint", "attributes", "descriptionEn", "descriptionAm"
  ON "Listing" FOR EACH ROW EXECUTE FUNCTION listing_search_vector_update();

-- Fuzzy matching (typos, partial words)
CREATE INDEX IF NOT EXISTS "Listing_titleEn_trgm_idx" ON "Listing" USING GIN ("titleEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Listing_titleAm_trgm_idx" ON "Listing" USING GIN ("titleAm" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Listing_refCode_trgm_idx" ON "Listing" USING GIN ("refCode" gin_trgm_ops);
