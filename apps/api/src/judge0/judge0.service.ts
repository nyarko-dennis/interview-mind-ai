import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SupportedLanguage } from '@interview-mind/shared';

function parseTestCounts(stdout: string | undefined): { passed: number; total: number } {
  if (!stdout) return { passed: 0, total: 1 };
  const m = stdout.match(/(\d+)\/(\d+)\s+tests?\s+passed/i);
  if (m) return { passed: parseInt(m[1]), total: parseInt(m[2]) };
  // stdout present but no structured marker → code ran clean, treat as 1/1
  return { passed: 1, total: 1 };
}

// Judge0 language IDs for supported languages
const LANGUAGE_IDS: Record<SupportedLanguage, number> = {
  python: 71,      // Python 3
  javascript: 63,  // Node.js
  typescript: 74,  // TypeScript
  java: 62,        // Java
  cpp: 54,         // C++ (GCC 9.2.0)
  go: 60,          // Go
  kotlin: 78,      // Kotlin
};

interface SubmissionResult {
  status: string;
  testsPassed: number;
  testsTotal: number;
  runtimeMs?: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  token: string;
}

@Injectable()
export class Judge0Service {
  private readonly baseUrl = process.env.JUDGE0_BASE_URL ?? 'http://localhost:2358';

  async submit(params: {
    code: string;
    language: SupportedLanguage;
    stdin?: string;
    expectedOutput?: string;
  }): Promise<string> {
    const res = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: params.code,
        language_id: LANGUAGE_IDS[params.language],
        stdin: params.stdin ?? '',
        expected_output: params.expectedOutput,
      }),
    });

    if (!res.ok) throw new ServiceUnavailableException('Judge0 submission failed');

    const data = (await res.json()) as { token: string };
    return data.token;
  }

  async getResult(token: string): Promise<SubmissionResult> {
    const res = await fetch(
      `${this.baseUrl}/submissions/${token}?base64_encoded=false&fields=status,stdout,time,memory,stderr`,
    );

    if (!res.ok) throw new ServiceUnavailableException('Judge0 result fetch failed');

    const data = (await res.json()) as {
      status: { description: string };
      stdout?: string;
      time?: string;
      memory?: number;
      stderr?: string;
    };

    const stdout = data.stdout ?? undefined;
    const parsed = parseTestCounts(stdout);

    return {
      status: data.status.description,
      testsPassed: parsed.passed,
      testsTotal: parsed.total,
      runtimeMs: data.time ? Math.round(parseFloat(data.time) * 1000) : undefined,
      memoryKb: data.memory,
      stdout,
      stderr: data.stderr ?? undefined,
      token,
    };
  }

  async submitAndWait(
    params: Parameters<Judge0Service['submit']>[0],
    pollIntervalMs = 500,
    timeoutMs = 10_000,
  ): Promise<SubmissionResult> {
    const token = await this.submit(params);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const result = await this.getResult(token);
      if (!['In Queue', 'Processing'].includes(result.status)) return result;
    }

    throw new ServiceUnavailableException('Judge0 execution timed out');
  }
}
