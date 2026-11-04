# Jeopardy AI (Gaeilge & English) 🇮🇪 🇬🇧

An AI-powered bilingual Jeopardy educational game platform designed specifically for teachers (such as Leaving Certificate and Junior Cycle Digital Technology teachers in Irish-medium schools, Gaelcholáistí, and English-medium schools).

Teachers can upload Irish PDF factfiles and their directly translated English PDF factfiles. Gemini AI aligns the terminology and generates complete rounds of Jeopardy-style categories, clues, and responses, which are stored in a **Neon PostgreSQL** serverless database.

Teachers can then switch to the **Game View** with a signature **Cool Blue Jeopardy aesthetic** and use the real-time **Hot Switch Language button** to toggle between Irish and English at any time during class.

---

## 🌟 Key Features

1. **Cool Blue Jeopardy Frontend**:
   - Authentic electric blue & navy game board styling (`#060ce9`, `#050c77`) with glowing gold point cards.
   - High-contrast, large-typography Clue Presenter view for classroom interactive whiteboards and projectors.
   - Synthesized Web Audio API sound effects (board chime, daily double fanfare, answer reveal, correct bell, wrong buzzer) without external audio dependencies.
   - Confetti celebrations when teams score.

2. **Hot Switch Language Button (🇮🇪 Gaeilge <-> 🇬🇧 English)**:
   - One-click instant language toggle accessible everywhere.
   - Available on the top bar AND directly inside the active question modal.
   - Teachers can switch language mid-question if a student asks for clarification in Irish or English without losing state or position.

3. **Teacher Upload Studio & Gemini AI**:
   - Upload 2 factfiles at once: Irish PDF (`Bileog Fíricí Gaeilge`) and translated English PDF.
   - Configurable for up to 3 rounds (Jeopardy, Double Jeopardy, and Final Jeopardy), optimized for Vercel/Cloudflare serverless payload limits.
   - Gemini structured prompt extracts key concepts and creates authentic Jeopardy-phrased clue/answer pairs (`"What is...?"` / `"Cad é...?"`).
   - "Load Sample Factfile" button allows instant testing without needing your own PDFs.

4. **Classroom Scoreboard**:
   - Manage teams (e.g. `Foireann A`, `Foireann B`, `Foireann C`).
   - 1-click `+$100`, `-$100`, or direct card-value point allocation.
   - Dynamic leader highlights and score reset.

5. **Neon PostgreSQL Database Schema**:
   - Serverless relational schema for storing games, rounds, categories, and bilingual questions.
   - Auto-migration and fallback local-memory mode: works instantly even before configuring `DATABASE_URL`.

---

## 🗄️ Neon PostgreSQL Database Schema

```sql
-- 1. Games Table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) DEFAULT 'Digital Technology',
  description TEXT,
  source_files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rounds Table (Supports up to 3 rounds)
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  round_name_en VARCHAR(100) NOT NULL,
  round_name_ga VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, round_number)
);

-- 3. Categories Table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name_en VARCHAR(255) NOT NULL,
  name_ga VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Questions Table (Bilingual clues & answers)
CREATE TABLE questions (
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

-- 5. Game Sessions Table (Scores and answered cards)
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL DEFAULT 'ga',
  current_round INT NOT NULL DEFAULT 1,
  teams_state JSONB NOT NULL,
  answered_question_ids JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your credentials:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `DATABASE_URL`: Your Neon PostgreSQL serverless connection string.

*(Note: The app runs in zero-config offline/demo mode out of the box if these are not provided!)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```
Ready to deploy to **Vercel** or **Cloudflare** with single-click zero-config deployment.
