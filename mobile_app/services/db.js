import * as SQLite from 'expo-sqlite';

let db;
let initPromise = null;

/**
 * Initialize the database and create tables
 * 
 * Viva Explanation:
 * - Sets up SQLite with WAL journal mode for concurrency
 * - Creates 'guides' table to store offline legal content
 * - Ensures cache availability without network
 * - Uses an init promise to prevent concurrent init race conditions
 */
async function initDatabase() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            db = await SQLite.openDatabaseAsync('guides.db');
            await db.execAsync(`
                PRAGMA journal_mode = WAL;
                CREATE TABLE IF NOT EXISTS guides (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT,
                    content TEXT,
                    last_updated TEXT
                );
            `);
            console.log('Database initialized');
        } catch (error) {
            // Reset so callers can retry
            initPromise = null;
            db = null;
            console.error('Database initialization failed:', error);
            throw error;
        }
    })();

    return initPromise;
}

/**
 * Ensure the database is ready before any operation.
 */
async function ensureDb() {
    if (!db) await initDatabase();
}

/**
 * Save or update guides in valid SQLite DB
 * @param {Array} guides - List of guide objects
 * 
 * Viva Explanation:
 * - Performs upsert (INSERT OR REPLACE) to keep cache fresh
 * - Uses a single transaction for atomicity and performance
 */
export async function saveGuides(guides) {
    await ensureDb();
    try {
        await db.withTransactionAsync(async () => {
            for (const guide of guides) {
                await db.runAsync(
                    'INSERT OR REPLACE INTO guides (id, title, category, content, last_updated) VALUES (?, ?, ?, ?, ?)',
                    [guide.id, guide.title, guide.category, guide.content, guide.last_updated]
                );
            }
        });
    } catch (error) {
        console.error('Failed to save guides:', error);
        throw error;
    }
}

/**
 * Get all guides from local DB
 */
export async function getGuides() {
    await ensureDb();
    try {
        const allRows = await db.getAllAsync('SELECT * FROM guides ORDER BY title');
        return allRows;
    } catch (error) {
        console.error('Failed to get guides:', error);
        return [];
    }
}

/**
 * Get a specific guide by ID
 */
export async function getGuideById(id) {
    await ensureDb();
    try {
        const row = await db.getFirstAsync('SELECT * FROM guides WHERE id = ?', [id]);
        return row;
    } catch (error) {
        console.error(`Failed to get guide ${id}:`, error);
        return null;
    }
}

export { initDatabase };
