import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

// Fast tasks (clarification eval, approach probing, hint selection) use Haiku.
// Debrief generation uses Sonnet. See PRD §6.4.
const HAIKU = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';

function getPersonaInstruction(persona: string): string {
  switch (persona) {
    case 'DISINTERESTED':
      return 'You are a distracted, disinterested interviewer. Keep all responses to 1–2 short sentences. Show minimal enthusiasm. Do not over-explain or encourage.';
    case 'NITPICKER':
      return 'You are a demanding, nitpicking interviewer. Always probe for precision — edge cases, naming, correctness, complexity claims. Never let vague answers slide without pushing back.';
    case 'BACKSEAT_CODER':
      return 'You are an opinionated interviewer who always offers an alternative perspective or counterpoint. Sometimes your suggestions are genuinely better; sometimes they are deliberate distractions. Always add a "but have you considered…" angle.';
    case 'COACH':
      return 'You are a warm, encouraging coach. Lead with positive reinforcement before giving critical feedback. Be generous with praise for good thinking.';
    default:
      return 'You are a professional technical interviewer.';
  }
}

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
    input: string,
    persona = 'STANDARD',
  ): Promise<{ passed: boolean; feedback: string; category: 'INPUT' | 'OUTPUT' | 'CONSTRAINTS' | 'EDGE_CASES' }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `${getPersonaInstruction(persona)} You are evaluating a candidate's clarification input during a technical interview.

Problem: ${problemStatement}

Candidate's input: "${input}"

The candidate may submit:
- A clarifying question about an aspect not explicitly covered by the problem
- A stated inference drawn from the problem (e.g. "Since the input is integers, I'll assume negatives are possible")
- A confirmed assumption about an area the problem partially addresses

Classify the input into exactly one category:
- INPUT: input format, data types, value ranges, or input structure
- OUTPUT: what to return, output format, or expected results
- CONSTRAINTS: time/space complexity requirements or problem-size limits
- EDGE_CASES: boundary conditions, empty/null inputs, duplicates, or special values

Pass if the input is substantive and demonstrates genuine consideration of that aspect of the problem.
Fail only vague or content-free inputs (e.g. "any constraints?" with no reasoning, or pure restatements of the problem with no added thought).

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
    persona = 'STANDARD',
  ): Promise<{ accepted: boolean; probe?: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `${getPersonaInstruction(persona)} The candidate is describing their brute-force solution.

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
    persona = 'STANDARD',
  ): Promise<{ accepted: boolean; probe?: string }> {
    const response = await this.client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `${getPersonaInstruction(persona)} The candidate is describing an improvement over their brute-force solution.

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
    persona = 'STANDARD',
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
          content: `${getPersonaInstruction(persona)} The candidate is describing what they believe is the optimal solution, or arguing that their improved solution is already optimal.

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

  async generateDebrief(params: {
    problemTitle: string;
    code: string;
    language: string;
    testsPassed: number;
    testsTotal: number;
    hintsUsed: number[];
    clarificationCoverage: Record<string, number>;
    clarificationAttempts: number;
    approachHistory: Record<string, string[]>;
    persona?: string;
  }): Promise<string> {
    const coverageSummary = Object.entries(params.clarificationCoverage)
      .map(([k, v]) => `${k}: ${v > 0 ? 'covered' : 'missed'}`)
      .join(', ');
    const approachSummary = Object.entries(params.approachHistory)
      .filter(([, msgs]) => msgs.length > 0)
      .map(([step, msgs]) => `${step}: ${msgs.join(' / ')}`)
      .join('\n');

    const response = await this.client.messages.create({
      model: SONNET,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${getPersonaInstruction(params.persona ?? 'STANDARD')} Generate a structured debrief for a technical interview session.

Problem: ${params.problemTitle}
Language: ${params.language}
Test results: ${params.testsPassed}/${params.testsTotal} passed
Hints used: levels ${params.hintsUsed.join(', ') || 'none'}
Clarification coverage: ${coverageSummary}
Clarification attempts: ${params.clarificationAttempts}
Approach discussion:
${approachSummary || 'N/A'}

Code submitted:
\`\`\`${params.language}
${params.code}
\`\`\`

Respond with JSON only — no markdown fences:
{
  "complexity": "1–2 sentences on the time/space complexity of the submitted code",
  "edgeCases": "1–2 sentences on how well edge cases were identified and handled",
  "communication": "1–2 sentences on the quality of clarifications and approach explanation",
  "improvement": "One concrete, actionable thing to do better next time"
}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return text;
  }

  async *streamHint(
    problemStatement: string,
    hintLevel: number,
    context: string,
    persona = 'STANDARD',
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: HAIKU,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `${getPersonaInstruction(persona)} Provide a Level ${hintLevel} hint to a candidate working through a technical problem.

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
