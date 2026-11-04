-- Jeopardy AI: Neon PostgreSQL Database Schema
-- Supports Bilingual (Irish & English) Games, Rounds, Categories, and Questions

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Games Table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) DEFAULT 'Digital Technology',
  description TEXT,
  source_files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rounds Table (Supports up to 3 rounds: Round 1, Round 2, Final Jeopardy)
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  round_name_en VARCHAR(100) NOT NULL DEFAULT 'Jeopardy Round',
  round_name_ga VARCHAR(100) NOT NULL DEFAULT 'Babhta Jeopardy',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, round_number)
);

-- 3. Categories Table (Columns in the Jeopardy grid)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ga VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Questions Table (Tiles in each category column)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  points INT NOT NULL,
  clue_en TEXT NOT NULL,
  clue_ga TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  answer_ga TEXT NOT NULL,
  explanation_en TEXT,
  explanation_ga TEXT,
  is_daily_double BOOLEAN DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Game Sessions Table (Persists active play session state, scores, and answered clues)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL DEFAULT 'ga',
  current_round INT NOT NULL DEFAULT 1,
  teams_state JSONB NOT NULL DEFAULT '[{"id":"1","name":"Foireann A","score":0},{"id":"2","name":"Foireann B","score":0}]'::jsonb,
  answered_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast lookups during classroom live games
CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_categories_round_id ON categories(round_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game_id ON game_sessions(game_id);
