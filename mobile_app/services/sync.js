import { saveGuides } from './db';
import { get_logger } from '../utils/logger';

const logger = get_logger('services/sync');

// Hardcoded for now to match api.js
const API_BASE_URL = 'https://law-gpt.app';

// Timeout for fetch requests (ms)
const SYNC_FETCH_TIMEOUT_MS = 15000;

/**
 * Sync guides from Backend API to Local DB
 * 
 * Viva Explanation:
 * - Fetches latest legal guides from central server
 * - Silently handles offline state by returning null
 * - Updates local SQLite cache on successful fetch
 * - Uses AbortController to prevent hanging requests
 */
export async function syncGuides() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_FETCH_TIMEOUT_MS);

    try {
        logger.info('Syncing guides...');
        const response = await fetch(`${API_BASE_URL}/api/v1/guides`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 404) {
                logger.warn('Guides endpoint not found (404)');
                return null;
            }
            // If offline or error, we just don't update
            logger.warn(`Sync failed or offline: ${response.status}`);
            return null;
        }

        const guides = await response.json();

        if (guides && Array.isArray(guides)) {
            await saveGuides(guides);
            logger.info(`Synced ${guides.length} guides`);
            return guides;
        }
        return null;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            logger.error('Sync timed out after ' + SYNC_FETCH_TIMEOUT_MS + 'ms');
            return null;
        }
        logger.error('Offline or sync failed:', error.message);
        return null;
    }
}
