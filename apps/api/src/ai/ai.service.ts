import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

// Fast tasks (clarification eval, approach probing, hint selection) use Haiku.
// Debrief generation uses Sonnet. See PRD §6.4.
const HAIKU = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';

function extractJson(text: string): string {
  // Strip markdown code fences if the model wraps its JSON output
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

@Injectable()
export class AiService {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async evaluateClarification(
    problemStatement: string,
    question: string,
  ): Promise<{ passed: boolean; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are evaluating a clarifying question asked during a technical interview.

Problem: ${problemStatement}

Candidate's clarifying question: "${question}"

Respond with JSON: { "passed": boolean, "feedback": string }
A question passes if it asks about constraints, edge cases, or expected output format in a substantive way.
Keep feedback to one sentence.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async probeApproach(
    problemStatement: string,
    approachDescription: string,
  ): Promise<{ accepted: boolean; probe?: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a senior engineer interviewer evaluating a candidate's approach description.

Problem: ${problemStatement}
Candidate's approach: "${approachDescription}"

Evaluate in this order:
1. Is the algorithm fundamentally sound for this problem?
2. Did the candidate state time AND space complexity (even approximately)?

Rules:
- If the approach is unsound: { "accepted": false, "probe": "<one question about the correctness issue>" }
- If the approach is sound but complexity is completely absent: { "accepted": false, "probe": "Your approach looks solid. What's the time and space complexity?" }
- If the approach is sound AND complexity was mentioned (even briefly): { "accepted": true }

Respond with JSON only.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async evaluateReview(params: {
    problemStatement: string;
    code: string;
    candidateReview: string;
  }): Promise<{ accepted: boolean; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a technical interviewer evaluating a candidate's post-implementation review.

Problem: ${params.problemStatement}

Code submitted:
\`\`\`
${params.code.slice(0, 800)}
\`\`\`

Candidate's review: "${params.candidateReview}"

Accept if the candidate made a genuine attempt to:
- State time complexity (O(n), O(n log n), etc.)
- State space complexity
- Mention at least one concrete test case or edge case they would verify

Accept even if the complexities are slightly off — the habit matters more than perfect accuracy at this stage.
Reject only if the response is entirely absent of complexity discussion or test cases.

Respond with JSON: { "accepted": boolean, "feedback": string }
Feedback: 1-2 sentences. If accepted, briefly affirm what was good and note anything to sharpen. If rejected, tell them specifically what's missing.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async generateDebrief(params: {
    problemTitle: string;
    code: string;
    language: string;
    testsPassed: number;
    testsTotal: number;
    hintsUsed: number[];
    clarificationNotes: string;
    approachNotes: string;
  }): Promise<string> {
    const response = await this.client.messages.create({
      model: SONNET,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate a structured debrief for a technical interview session.

Problem: ${params.problemTitle}
Language: ${params.language}
Test results: ${params.testsPassed}/${params.testsTotal} passed
Hints used: levels ${params.hintsUsed.join(', ') || 'none'}
Clarification phase notes: ${params.clarificationNotes}
Approach phase notes: ${params.approachNotes}

Code submitted:
\`\`\`${params.language}
${params.code}
\`\`\`

Write a concise debrief covering: time/space complexity analysis, edge case coverage, communication quality, and one concrete improvement suggestion.`,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async *streamHint(
    problemStatement: string,
    hintLevel: number,
    context: string,
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are coaching a candidate through a technical problem. Provide a Level ${hintLevel} hint.

Rules:
- Never write or complete code for the candidate
- Pseudocode scaffolds are acceptable only at level 3
- Be Socratic — guide thinking, don't reveal the answer

Problem: ${problemStatement}
Context: ${context}

Deliver the hint now.`,
        },
      ],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }

  // ── Dojo drill scoring (all Haiku, COACH persona) ─────────────────────────

  async scorePatternId(params: {
    prompt: string;
    correctPattern: string;
    userAnswer: string;
  }): Promise<{ correct: boolean; score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a supportive coding coach (not an evaluator) scoring a pattern identification drill.

The correct algorithmic pattern for this problem is: ${params.correctPattern}

The candidate's answer: "${params.userAnswer}"

Rules:
- Accept reasonable natural-language variations (e.g. "sliding window" for SLIDING_WINDOW, "two pointer" for TWO_POINTERS, "BFS" or "breadth first search" for BFS)
- A partially correct answer that names the right pattern but explains it poorly is still correct
- Score is 100 if correct, 0 if incorrect
- Feedback must be 2–3 sentences in a warm coaching voice: celebrate if correct, explain the gap and hint at the right direction if wrong. Never just say "wrong."

Respond with JSON only: { "correct": boolean, "score": number, "feedback": string }`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async scoreClarificationDrill(params: {
    problemPrompt: string;
    userQuestions: string;
  }): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a supportive coding coach scoring a clarification drill. The candidate wrote clarifying questions they would ask at the start of a technical interview.

Problem given to the candidate:
${params.problemPrompt}

Candidate's clarifying questions:
${params.userQuestions}

Score 0–100 based on:
- Relevance: do the questions target real ambiguities in this specific problem? (40 pts)
- Coverage: do they cover constraints, output format, and edge cases? (30 pts)
- Priority: are the most impactful questions asked first? (15 pts)
- Precision: are questions specific rather than vague ("any constraints?")? (15 pts)

Deduct points for: asking what can be inferred from examples, asking implementation questions, asking more than 6 questions.

Respond with JSON: { "score": number, "feedback": string }
Feedback must be 3–4 sentences, warm coaching voice. Highlight one specific strength and one concrete improvement.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async scoreApproachDrill(params: {
    problemPrompt: string;
    userApproach: string;
  }): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a supportive coding coach scoring an approach description drill. The candidate described how they would solve a problem before coding.

Problem:
${params.problemPrompt}

Candidate's approach:
${params.userApproach}

Score 0–100 based on:
- Correctness: is the algorithm fundamentally sound? (35 pts)
- Brute force acknowledged: did they mention a naive solution and why it's too slow? (20 pts)
- Complexity stated: did they give time and space complexity? (20 pts)
- Edge cases: did they call out at least one edge case? (15 pts)
- Clarity: is the explanation clear enough to code from? (10 pts)

Respond with JSON: { "score": number, "feedback": string }
Feedback must be 3–4 sentences, warm coaching voice. Name one concrete strength and one specific thing to add or improve.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }
}
