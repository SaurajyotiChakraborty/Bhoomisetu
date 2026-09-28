// Bhoomisetu — Dev Outbox API
// GET /api/v1/dev/outbox — shows all sent OTPs, hex codes, notifications in dev mode

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, createRequestId } from '@/lib/api/helpers';
import { getDevOutboxEntries } from '@/lib/services/notification-service';

export async function GET(req: NextRequest) {
  // Only available in non-production
  if (process.env.NODE_ENV === 'production') {
    return errorResponse('FORBIDDEN_ACTION', 'Dev outbox not available in production', 403, createRequestId());
  }

  const entries = getDevOutboxEntries();

  return successResponse({
    entries,
    count: entries.length,
  });
}
