CREATE TABLE IF NOT EXISTS farms (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS housing (
  id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, name),
  UNIQUE (id, farm_id)
);
CREATE TABLE IF NOT EXISTS animals (
  id BIGSERIAL PRIMARY KEY,
  farm_id BIGINT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  housing_id BIGINT,
  species TEXT NOT NULL CHECK (species IN ('pig','cattle','goat','sheep','chicken','fish','horse','donkey','rabbit')),
  tag TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sex TEXT NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male','female','mixed','unknown')),
  birth_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','dead','transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, tag),
  FOREIGN KEY (housing_id, farm_id) REFERENCES housing(id, farm_id)
);
CREATE INDEX IF NOT EXISTS animals_farm_species_idx ON animals(farm_id, species);
CREATE INDEX IF NOT EXISTS housing_farm_idx ON housing(farm_id);
