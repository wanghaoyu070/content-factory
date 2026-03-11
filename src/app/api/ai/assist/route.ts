import { auth } from '@/auth';
import { callAI } from '@/lib/ai';
import { getAIConfig } from '@/lib/config';
import {
    badRequestResponse,
    createRequestId,
    serverErrorResponse,
    successResponse,
    unauthorizedResponse,
} from '@/lib/api-response';

interface AssistRequest {
    action: 'rewrite' | 'expand' | 'simplify' | 'polish' | 'continue';
    text: string;
}

export async function POST(request: Request) {
    const requestId = createRequestId();
    const session = await auth();
    if (!session?.user?.id) {
        return unauthorizedResponse('请先登录', requestId);
    }

    try {
        const { action, text }: AssistRequest = await request.json();

        if (!text || !action) {
            return badRequestResponse('缺少必要参数', requestId);
        }

        // 获取 AI 配置
        const aiConfig = getAIConfig(session.user.id);
        if (!aiConfig) {
            return badRequestResponse('请先配置 AI 接口', requestId);
        }

        // 构建系统提示词
        const systemPrompt = `你是一个专业的中文文案编辑助手。请根据用户的要求处理文本，直接返回处理后的结果，不要包含任何解释或额外的说明。`;

        // 根据操作类型构建用户提示词
        let userPrompt = '';
        switch (action) {
            case 'rewrite':
                userPrompt = `请改写以下文本，保持原意但使用不同的表达方式，使其更加新颖独特：

${text}`;
                break;
            case 'expand':
                userPrompt = `请扩展以下文本，添加更多细节、例子和论述，使内容更加丰富充实：

${text}`;
                break;
            case 'simplify':
                userPrompt = `请精简以下文本，去除冗余的表述，保留核心内容，使表达更加简洁有力：

${text}`;
                break;
            case 'polish':
                userPrompt = `请润色以下文本，改进措辞和语法，使其更加流畅、专业、优美：

${text}`;
                break;
            case 'continue':
                userPrompt = `请续写以下文本，保持相同的风格和语调，自然地延续内容（续写约100-200字）：

${text}`;
                break;
            default:
                return badRequestResponse('无效的操作类型', requestId);
        }

        // 调用 AI
        const result = await callAI(aiConfig, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ]);

        return successResponse({
            result: result.trim(),
        }, 200, requestId);
    } catch (error) {
        console.error(`[API ${requestId}] AI 处理失败:`, error);
        return serverErrorResponse(error instanceof Error ? error.message : 'AI 处理失败', requestId);
    }
}
