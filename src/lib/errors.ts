import { DuplicateReportError, OfflineError, RateLimitError, ValidationError } from '@/data/api';
import { t } from '@/i18n/es-CR';

/** The message to toast when a write fails: rate limit (429), offline, the API's validation text, or a generic one. */
export function errorMessage(e: unknown): string {
  if (e instanceof RateLimitError) return t.common.rateLimited;
  if (e instanceof OfflineError) return t.common.needsNetworkAction;
  if (e instanceof DuplicateReportError) return t.report.dupe;
  if (e instanceof ValidationError && e.message && e.message !== e.name) return e.message;
  return t.common.actionFailed;
}
