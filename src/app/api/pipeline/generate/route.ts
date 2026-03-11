/**
 * Pipeline API — Manual trigger + Monitor endpoints
 *
 * POST /api/pipeline/generate — Manual: generate article from a topic
 * POST /api/pipeline/monitor  — Auto: scan for mature topics and generate
 * GET  /api/pipeline/status   — Check pipeline status
 */

import { auth } from '@/auth';
import { aggregateMaterials, discoverMatureTopics } from '@/lib/material';
import { autoGenerateArticle, type PipelineResult } from '@/lib/auto-generate';
import {
    badRequestResponse,
    createRequestId,
    unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

// ─── POST: Manual trigger — generate from topic ──────────────────

const generateSchema = z.object({
    topic: z.string().min(1, 'Topic is required'),
});

export async function POST(request: Request) {
    const requestId = createRequestId();

    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    try {
        const body = await request.json();
        const parsed = generateSchema.safeParse(body);

        if (!parsed.success) {
            return badRequestResponse(parsed.error.issues[0]?.message || 'Invalid request', requestId);
        }

        const { topic } = parsed.data;
        const userId = Number(session.user.id);

        console.log(`[pipeline] Manual trigger for topic: "${topic}" by user ${userId}`);

        // Step 1: Aggregate materials from Second Brain
        const library = await aggregateMaterials(topic);

        if (library.materials.length === 0) {
            return Response.json(
                {
                    success: false,
                    requestId,
                    error: `No materials found for topic "${topic}" in Second Brain`,
                    suggestion: 'Collect some articles/tweets about this topic first via Chrome extension or WeRSS',
                },
                { status: 404 }
            );
        }

        // Step 2: Generate article (supplement + compose + screenshot + save)
        const result = await autoGenerateArticle(library, userId);

        return Response.json({
            success: true,
            requestId,
            data: result,
            message: `Article "${result.title}" generated with ${result.materialCount} materials and ${result.screenshotCount} screenshots`,
        });
    } catch (error) {
        console.error('[pipeline] Generation failed:', error);
        return Response.json(
            {
                success: false,
                requestId,
                error: error instanceof Error ? error.message : 'Pipeline failed',
            },
            { status: 500 }
        );
    }
}
