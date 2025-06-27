import { NextRequest, NextResponse } from 'next/server';

// Debug: log all environment variables
console.log('process.env:', process.env);

// export const runtime = 'edge'; // Removed to use Node.js runtime

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Debug log (remove after testing)
  console.log('ANTHROPIC_API_KEY:', apiKey ? apiKey.slice(0, 6) + '...' : 'undefined');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Anthropic API key.' }, { status: 500 });
  }

  const { messages } = await req.json();
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: 'Invalid request: messages must be an array.' }, { status: 400 });
  }

  // Convert OpenAI-style messages to Anthropic format
  // OpenAI: [{role: 'user'|'assistant', content: string}, ...]
  // Anthropic: system prompt (optional), then alternating user/assistant messages
  let systemPrompt = '';
  const anthropicMessages = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // Build the Claude message array
  // Anthropic expects: [{role: 'user', content: '...'}, {role: 'assistant', content: '...'}, ...]
  // We'll send the full conversation minus system as is

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt || undefined,
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.error?.message || 'Anthropic API error.' }, { status: response.status });
    }

    const data = await response.json();
    // Claude's response is in data.content (array of {type: 'text', text: ...})
    const aiMessage = data.content?.map((c: { type: string; text: string }) => c.text).join('') || '';
    return NextResponse.json({ message: { role: 'assistant', content: aiMessage } });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 