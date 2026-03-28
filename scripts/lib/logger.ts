/**
 * Simple structured logger for scripts
 */

export const logger = {
  error(context: string, message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errorMsg = error instanceof Error ? error.message : String(error ?? "Unknown error");
    console.error(`[${timestamp}] ERROR [${context}]: ${message}${errorMsg ? ` - ${errorMsg}` : ""}`);
  },

  warn(context: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN [${context}]: ${message}`);
  },

  info(context: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO [${context}]: ${message}`);
  },
};
