import { neon } from '@neondatabase/serverless';
import { JeopardyGame, Round, Category, Question } from '@/types/jeopardy';
import { sampleBilingualGame } from '@/lib/sample-data';

// Dynamically retrieve connection string from Vercel / Neon environment variables
export function getConnectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED ||
    '';
  return url.trim();
}

export function isDbConfigured(): boolean {
  const conn = getConnectionString();
  return Boolean(
    conn && (conn.startsWith('postgres://') || conn.startsWith('postgresql://'))
  );
}

export function getDb() {
  const conn = getConnectionString();
  if (!isDbConfigured()) {
    return null;
  }
  return neon(conn);
}

// Ensure database tables exist
export async function initDb(): Promise<{ success: boolean; message: string }> {
  if (!isDbConfigured()) {
    return {
      success: false,
      message: 'DATABASE_URL or POSTGRES_URL is not configured in environment variables.',
    };
  }

  const sql = neon(getConnectionString());
  try {
    // Both gen_random_uuid() and uuid_generate_v4() support
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.catch(() => {});

    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100) DEFAULT 'Digital Technology',
        description TEXT,
        source_files JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        round_number INT NOT NULL,
        round_name_en VARCHAR(100) NOT NULL DEFAULT 'Jeopardy Round',
        round_name_ga VARCHAR(100) NOT NULL DEFAULT 'Babhta Jeopardy',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_id, round_number)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        name_en VARCHAR(255) NOT NULL,
        name_ga VARCHAR(255) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        language VARCHAR(10) NOT NULL DEFAULT 'ga',
        current_round INT NOT NULL DEFAULT 1,
        teams_state JSONB NOT NULL DEFAULT '[{"id":"1","name":"Foireann A","score":0},{"id":"2","name":"Foireann B","score":0}]'::jsonb,
        answered_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return { success: true, message: 'Neon database tables verified and ready!' };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, message: (error as Error).message };
  }
}

// Save complete bilingual game to Neon DB
export async function saveGameToDb(
  game: JeopardyGame
): Promise<{ success: boolean; gameId?: string; error?: string }> {
  if (!isDbConfigured()) {
    return { success: false, error: 'DATABASE_URL/POSTGRES_URL is not set.' };
  }

  const sql = neon(getConnectionString());

  try {
    // 1. Insert Game
    const gameResult = await sql`
      INSERT INTO games (title, subject, description)
      VALUES (${game.title}, ${game.subject || 'Digital Technology'}, ${game.description || ''})
      RETURNING id
    `;
    const gameId = gameResult[0].id;

    // 2. Insert Rounds
    for (const round of game.rounds) {
      const roundResult = await sql`
        INSERT INTO rounds (game_id, round_number, round_name_en, round_name_ga)
        VALUES (${gameId}, ${round.roundNumber}, ${round.name_en}, ${round.name_ga})
        RETURNING id
      `;
      const roundId = roundResult[0].id;

      // 3. Insert Categories
      for (let cIdx = 0; cIdx < round.categories.length; cIdx++) {
        const cat = round.categories[cIdx];
        const catResult = await sql`
          INSERT INTO categories (round_id, name_en, name_ga, position)
          VALUES (${roundId}, ${cat.name_en}, ${cat.name_ga}, ${cIdx})
          RETURNING id
        `;
        const catId = catResult[0].id;

        // 4. Insert Questions
        for (let qIdx = 0; qIdx < cat.questions.length; qIdx++) {
          const q = cat.questions[qIdx];
          await sql`
            INSERT INTO questions (
              category_id, points, clue_en, clue_ga, answer_en, answer_ga,
              explanation_en, explanation_ga, is_daily_double, position
            )
            VALUES (
              ${catId}, ${q.points}, ${q.clue_en}, ${q.clue_ga}, ${q.answer_en}, ${q.answer_ga},
              ${q.explanation_en || null}, ${q.explanation_ga || null}, ${q.isDailyDouble || false}, ${qIdx}
            )
          `;
        }
      }
    }

    return { success: true, gameId };
  } catch (err) {
    console.error('Failed to save game to Neon DB:', err);
    return { success: false, error: (err as Error).message };
  }
}

// Fetch all games
export async function getGamesFromDb(): Promise<JeopardyGame[]> {
  if (!isDbConfigured()) {
    return [sampleBilingualGame];
  }

  const sql = neon(getConnectionString());
  try {
    const games = await sql`
      SELECT id, title, subject, description, created_at
      FROM games
      ORDER BY created_at DESC
    `;

    if (!games || games.length === 0) {
      return [sampleBilingualGame];
    }

    return games.map((g) => ({
      id: g.id,
      title: g.title,
      subject: g.subject,
      description: g.description,
      rounds: [],
      createdAt: g.created_at,
    }));
  } catch (error) {
    console.error('Error fetching games from Neon:', error);
    return [sampleBilingualGame];
  }
}

// Delete a game (cascades to rounds → categories → questions)
export async function deleteGameFromDb(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isDbConfigured()) {
    return { success: false, error: 'DATABASE_URL/POSTGRES_URL is not set.' };
  }
  const sql = neon(getConnectionString());
  try {
    await sql`DELETE FROM games WHERE id = ${id}`;
    return { success: true };
  } catch (err) {
    console.error('Error deleting game from Neon:', err);
    return { success: false, error: (err as Error).message };
  }
}

// Fetch single complete game by ID
export async function getGameByIdFromDb(id: string): Promise<JeopardyGame | null> {
  if (id === sampleBilingualGame.id || !isDbConfigured()) {
    return sampleBilingualGame;
  }

  const sql = neon(getConnectionString());
  try {
    const games = await sql`SELECT * FROM games WHERE id = ${id}`;
    if (!games.length) return null;
    const g = games[0];

    const roundsData = await sql`
      SELECT * FROM rounds WHERE game_id = ${id} ORDER BY round_number ASC
    `;

    const rounds: Round[] = [];

    for (const r of roundsData) {
      const catsData = await sql`
        SELECT * FROM categories WHERE round_id = ${r.id} ORDER BY position ASC
      `;

      const categories: Category[] = [];

      for (const c of catsData) {
        const questionsData = await sql`
          SELECT * FROM questions WHERE category_id = ${c.id} ORDER BY points ASC, position ASC
        `;

        const questions: Question[] = questionsData.map((q) => ({
          id: q.id,
          points: q.points,
          clue_en: q.clue_en,
          clue_ga: q.clue_ga,
          answer_en: q.answer_en,
          answer_ga: q.answer_ga,
          explanation_en: q.explanation_en,
          explanation_ga: q.explanation_ga,
          isDailyDouble: q.is_daily_double,
        }));

        categories.push({
          id: c.id,
          name_en: c.name_en,
          name_ga: c.name_ga,
          questions,
        });
      }

      rounds.push({
        id: r.id,
        roundNumber: r.round_number,
        name_en: r.round_name_en,
        name_ga: r.round_name_ga,
        categories,
      });
    }

    return {
      id: g.id,
      title: g.title,
      subject: g.subject,
      description: g.description,
      rounds,
      createdAt: g.created_at,
    };
  } catch (error) {
    console.error('Error fetching game details from DB:', error);
    return null;
  }
}
