import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { SupportedLanguage } from '@interview-mind/shared';

const PISTON_LANG: Record<SupportedLanguage, string> = {
  python:     'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java:       'java',
  cpp:        'c++',
  go:         'go',
  kotlin:     'kotlin',
};

function parseTestCounts(stdout: string | undefined): { passed: number; total: number } {
  if (!stdout) return { passed: 0, total: 0 };
  const m = stdout.match(/(\d+)\/(\d+)\s+tests?\s+passed/i);
  if (m) return { passed: parseInt(m[1]), total: parseInt(m[2]) };
  return { passed: 0, total: 0 };
}

export interface PistonResult {
  status: string;
  testsPassed: number;
  testsTotal: number;
  stderr?: string;
}

@Injectable()
export class PistonService {
  private readonly baseUrl = process.env.PISTON_BASE_URL ?? 'http://localhost:2000';

  async execute(params: { code: string; language: SupportedLanguage }): Promise<PistonResult> {
    const res = await fetch(`${this.baseUrl}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: PISTON_LANG[params.language],
        version: '*',
        files: [{ content: params.code }],
        // Kotlin's JVM startup is CPU-heavy; give it more headroom.
        ...(params.language === 'kotlin' && {
          compile_timeout: 25000,
          compile_cpu_time: 50000,
        }),
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableException(`Piston unavailable (${res.status})`);
    }

    const data = await res.json() as {
      language: string;
      version: string;
      run: { stdout: string; stderr: string; code: number; signal: string | null };
      compile?: { stdout: string; stderr: string; code: number; signal: string | null };
    };

    let status: string;
    if (data.compile && data.compile.code !== 0) {
      status = 'Compilation Error';
    } else if (data.run.signal === 'SIGKILL') {
      status = 'Time Limit Exceeded';
    } else if (data.run.code !== 0) {
      status = 'Runtime Error';
    } else {
      status = 'Accepted';
    }

    const stderr =
      data.compile && data.compile.code !== 0
        ? data.compile.stderr || data.run.stderr
        : data.run.stderr || undefined;

    const parsed = parseTestCounts(data.run.stdout);

    return { status, testsPassed: parsed.passed, testsTotal: parsed.total, stderr };
  }
}
