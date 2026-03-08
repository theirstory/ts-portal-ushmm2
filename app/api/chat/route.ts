import Anthropic from '@anthropic-ai/sdk';
import { retrieveChunksForChat } from '@/lib/weaviate/chatRetrieval';
import { ChatRequest, Citation } from '@/types/chat';

const anthropic = new Anthropic();

function buildSystemPrompt(citations: Citation[]): string {
  const sourcesBlock = citations
    .map(
      (c) =>
        `[${c.index}] Speaker: ${c.speaker} | Interview: "${c.interviewTitle}" | Section: "${c.sectionTitle}" | Time: ${formatTime(c.startTime)}–${formatTime(c.endTime)}\n"${c.transcription}"`,
    )
    .join('\n\n');

  return `You are a helpful research assistant for an oral history interview archive. Answer questions based on the interview transcript excerpts provided below.

RULES:
- Use numbered citations like [1], [2] to reference sources. Always cite your sources.
- Include direct quotes from the transcripts when relevant, using quotation marks.
- If the sources don't contain enough information to answer, say so honestly.
- Be concise but thorough. Synthesize information across multiple sources when relevant.
- When multiple speakers discuss the same topic, note the different perspectives.

SOURCES:
${sourcesBlock}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { messages, query } = body;

    if (!query?.trim()) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    const citations = await retrieveChunksForChat(query, 8);

    const systemPrompt = buildSystemPrompt(citations);

    const anthropicMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send citations first so client can render chips during streaming
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`),
        );

        try {
          const anthropicStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: anthropicMessages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text', content: event.delta.text })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`),
          );
        } catch (err) {
          console.error('Anthropic streaming error:', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'text', content: 'Sorry, an error occurred while generating the response.' })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`),
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
