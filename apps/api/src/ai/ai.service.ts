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
  ): Promise<{ passed: boolean; feedback: string; category: 'INPUT' | 'OUTPUT' | 'CONSTRAINTS' | 'EDGE_CASES' }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are evaluating a clarifying question asked during a technical interview.

Problem: ${problemStatement}

Candidate's clarifying question: "${question}"

Classify the question into exactly one category:
- INPUT: questions about input format, data types, value ranges, or input structure
- OUTPUT: questions about what to return, output format, or expected results
- CONSTRAINTS: questions about time/space complexity requirements or problem-size limits
- EDGE_CASES: questions about boundary conditions, empty/null inputs, duplicates, or special values

A question passes if it is substantive and specific to this problem.
Vague questions ("any constraints?") or questions answerable from the problem statement do not pass.

Respond with JSON only: { "passed": boolean, "feedback": string, "category": "INPUT" | "OUTPUT" | "CONSTRAINTS" | "EDGE_CASES" }
Keep feedback to one sentence.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async evaluateNaiveApproach(
    problemStatement: string,
    description: string,
  ): Promise<{ accepted: boolean; probe?: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a senior engineer interviewer. The candidate is describing their brute-force solution.

Problem: ${problemStatement}
Candidate's brute-force description: "${description}"

Accept if ALL of:
1. The algorithm is a valid (even if slow) solution to the problem
2. They stated the time complexity (e.g. O(n²), O(2^n)) — space complexity optional here
3. They named or implied WHY it is suboptimal (e.g. "nested loops", "redundant work", "exponential")

If not accepted, give one focused probe question addressing the first missing element.

Respond with JSON only: { "accepted": boolean, "probe"?: string }`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async evaluateImprovedApproach(
    problemStatement: string,
    description: string,
  ): Promise<{ accepted: boolean; probe?: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a senior engineer interviewer. The candidate is describing an improvement over their brute-force solution.

Problem: ${problemStatement}
Candidate's improved approach: "${description}"

Accept if ALL of:
1. The algorithm is a genuine improvement (better time or space complexity than naive)
2. They named what changed (e.g. data structure, technique, pruning strategy)
3. They stated both the improved time AND space complexity

If not accepted, give one focused probe question addressing the first missing element.

Respond with JSON only: { "accepted": boolean, "probe"?: string }`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async evaluateOptimalApproach(
    problemStatement: string,
    optimalTimeComplexity: string | null,
    description: string,
  ): Promise<{ accepted: boolean; probe?: string }> {
    const complexityHint = optimalTimeComplexity
      ? `The known optimal time complexity for this problem is ${optimalTimeComplexity}.`
      : 'No known optimal complexity is provided — use your judgement.';

    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a senior engineer interviewer. The candidate is describing what they believe is the optimal solution, or arguing that their improved solution is already optimal.

Problem: ${problemStatement}
${complexityHint}

Candidate's response: "${description}"

Accept if:
- Their solution matches or reaches the known optimal complexity, AND they correctly explain why it cannot be improved further, OR
- Their improved solution IS already optimal and they correctly identify it as such with justification

If not accepted, give one focused probe question — either challenging the optimality claim or asking them to justify why further improvement is impossible.

Respond with JSON only: { "accepted": boolean, "probe"?: string }`,
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

Score 0–100 using these weighted categories:
- Input (30 pts): questions about input format, data types, value ranges, or input structure
- Output (30 pts): questions about what to return, output format, or expected results
- Edge Cases (25 pts): questions about boundary conditions, empty/null inputs, duplicates, or special values
- Constraints (15 pts): questions about time/space complexity requirements or problem-size limits

Award full points in a category if the candidate asked at least 3 substantive, specific questions in it (2 for Constraints).
Deduct points for vague questions ("any constraints?") or questions answerable from the problem statement.

Respond with JSON: { "score": number, "feedback": string }
Feedback must be 3–4 sentences, warm coaching voice. Name which categories were well covered and which need more depth.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async scoreNaiveApproachDrill(params: {
    problemPrompt: string;
    userAnswer: string;
  }): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a supportive coding coach scoring a brute-force approach drill. The candidate described their naive solution to a problem.

Problem:
${params.problemPrompt}

Candidate's brute-force description:
${params.userAnswer}

Score 0–100 based on:
- Correctness: is the described algorithm a valid (even if slow) solution? (40 pts)
- Complexity stated: did they give the time complexity? (30 pts)
- Suboptimality explained: did they name WHY it is naive — the bottleneck, redundant work, or inefficient structure? (30 pts)

Respond with JSON: { "score": number, "feedback": string }
Feedback must be 3–4 sentences, warm coaching voice. Praise what was clear; identify the weakest element specifically.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async scoreImprovedApproachDrill(params: {
    problemPrompt: string;
    userAnswer: string;
  }): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a supportive coding coach scoring an improvement drill. The candidate described how they would optimise their brute-force solution.

Problem:
${params.problemPrompt}

Candidate's improved approach:
${params.userAnswer}

Score 0–100 based on:
- Genuine improvement: is the described change actually faster or more space-efficient? (35 pts)
- What changed: did they name the key insight, data structure, or technique that enables the improvement? (35 pts)
- Complexity before and after: did they state both the old and new time AND space complexity? (30 pts)

Respond with JSON: { "score": number, "feedback": string }
Feedback must be 3–4 sentences, warm coaching voice. Name one concrete strength and one specific gap.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }

  async scoreOptimalApproachDrill(params: {
    problemPrompt: string;
    userAnswer: string;
  }): Promise<{ score: number; feedback: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a supportive coding coach scoring an optimality drill. The candidate either described a further optimal solution or argued that their improved solution is already optimal.

Problem:
${params.problemPrompt}

Candidate's response:
${params.userAnswer}

Score 0–100 based on:
- Correctness of claim: is the solution they describe (or identify as optimal) actually optimal for this problem? (40 pts)
- Justification: did they explain WHY no further improvement is possible (lower bound, theoretical limit, proof sketch)? (35 pts)
- Complexity stated: did they state the final time and space complexity? (25 pts)

Respond with JSON: { "score": number, "feedback": string }
Feedback must be 3–4 sentences, warm coaching voice. Confirm or gently correct the optimality claim; name what the justification was missing if anything.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(extractJson(text));
  }
}
