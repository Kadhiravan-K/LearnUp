import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { tokenUsageRepository } from '@/lib/db/token-usage-repository';
import { settingsRepository } from '@/lib/db/settings-repository';
import { summarizeTokenUsage } from '@/lib/plugins/token-monetization';
import { formatErrorResponse } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { validateInput, recordTokenUsageSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/plugins/token-usage - Retrieve token usage analytics and monthly budget tracking
 */
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const records = await tokenUsageRepository.listByUser(supabase, user.id, 200);

    // Assume default $20 monthly budget or could be derived from user settings if present
    const summary = summarizeTokenUsage(records, 20.00);

    return NextResponse.json({ data: { summary, recentRecords: records.slice(0, 20) } }, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to get token usage', { operation: 'GET /api/plugins/token-usage', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/plugins/token-usage - Log an AI token consumption record with automatic cost calculation
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const rawBody = await request.json();
    const validated = validateInput(recordTokenUsageSchema, rawBody);

    const record = await tokenUsageRepository.recordUsage(supabase, user.id, {
      provider: validated.provider,
      model: validated.model,
      promptTokens: validated.prompt_tokens,
      completionTokens: validated.completion_tokens,
      operation: validated.operation
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err);
    logger.error('Failed to record token usage', { operation: 'POST /api/plugins/token-usage', error: body.error.message, statusCode: status });
    return NextResponse.json(body, { status });
  }
}
