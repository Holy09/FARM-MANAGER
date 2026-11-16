BEGIN;
CREATE TABLE IF NOT EXISTS farms (
 id BIGSERIAL PRIMARY KEY,
 name TEXT NOT NULL CHECK (length(trim(name)) > 0),
 location TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS housing (
 id BIGSERIAL PRIMARY KEY,
 farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 species TEXT NOT NULL CHECK (species IN ('pig','cattle','goat','sheep','chicken','fish','horse','donkey','rabbit')),
 capacity INTEGER NOT NULL CHECK (capacity > 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (farm_id, name),
 UNIQUE (id, farm_id)
);
CREATE TABLE IF NOT EXISTS animals (
 id BIGSERIAL PRIMARY KEY,
 farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
 tag TEXT NOT NULL,
 species TEXT NOT NULL CHECK (species IN ('pig','cattle','goat','sheep','chicken','fish','horse','donkey','rabbit')),
 sex TEXT NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male','female','unknown','mixed')),
 quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
 birth_date DATE,
 weight_kg NUMERIC(12,3) CHECK (weight_kg >= 0),
 housing_id BIGINT,
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','dead','transferred')),
 notes TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (farm_id, tag),
 FOREIGN KEY (housing_id, farm_id) REFERENCES housing(id, farm_id)
);
CREATE INDEX IF NOT EXISTS animals_farm_species_idx ON animals(farm_id, species);
CREATE INDEX IF NOT EXISTS housing_farm_idx ON housing(farm_id);
COMMIT;
