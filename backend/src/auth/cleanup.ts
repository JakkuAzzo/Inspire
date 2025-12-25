/**
 * Cleanup Job for Expired Users and Sessions
 * Runs periodically to remove:
 * - Pending users older than 14 days
 * - Expired guest sessions
 */

import { cleanupExpiredPendingUsers, cleanupExpiredGuestSessions } from './store';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run every hour

/**
 * Run cleanup job once
 */
export function runCleanup(): { pendingUsers: number; guestSessions: number } {
  console.log('[cleanup] Starting cleanup job...');
  
  const removedPendingUsers = cleanupExpiredPendingUsers();
  const removedGuestSessions = cleanupExpiredGuestSessions();
  
  console.log(`[cleanup] Removed ${removedPendingUsers} expired pending users`);
  console.log(`[cleanup] Removed ${removedGuestSessions} expired guest sessions`);
  
  return {
    pendingUsers: removedPendingUsers,
    guestSessions: removedGuestSessions
  };
}

/**
 * Start periodic cleanup job
 */
export function startCleanupJob(): NodeJS.Timeout {
  console.log('[cleanup] Starting periodic cleanup job (every hour)');
  
  // Run immediately on start
  runCleanup();
  
  // Then run every hour
  const interval = setInterval(() => {
    runCleanup();
  }, CLEANUP_INTERVAL);
  
  return interval;
}

/**
 * Stop cleanup job
 */
export function stopCleanupJob(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log('[cleanup] Stopped cleanup job');
}
