/**
 * Mobile App Logger Utility
 * Provides a standardized way to log messages with module context.
 */

export function get_logger(name) {
    return {
        info: (msg) => console.log(`[${name}] ${msg}`),
        error: (msg, err) => {
            if (err) {
                console.error(`[${name}] ${msg}`, err);
            } else {
                console.error(`[${name}] ${msg}`);
            }
        },
        warn: (msg) => console.warn(`[${name}] ${msg}`),
        debug: (msg) => console.debug(`[${name}] ${msg}`),
    };
}
