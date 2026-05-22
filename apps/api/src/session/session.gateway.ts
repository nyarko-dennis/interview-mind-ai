import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './session.service';
import { AiService } from '../ai/ai.service';
import { WsServerEvents } from '@interview-mind/shared';
import type { SupportedLanguage } from '@interview-mind/shared';
import type { JwtPayload } from '../auth/jwt.strategy';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' },
  namespace: '/session',
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly ai: AiService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
      client.data.email = payload.email;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS] disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.join(data.sessionId);
  }

  @SubscribeMessage('clarification:submit')
  async handleClarification(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { sessionId: string; input: string },
  ) {
    try {
      const result = await this.sessionService.evaluateClarification(
        data.sessionId,
        data.input,
      );
      this.server
        .to(data.sessionId)
        .emit(WsServerEvents.CLARIFICATION_RESULT, result);

      if (result.passed) {
        this.server
          .to(data.sessionId)
          .emit(WsServerEvents.PHASE_CHANGE, { phase: 'APPROACH' });
      }
    } catch (err) {
      this.server.to(data.sessionId).emit(WsServerEvents.SESSION_ERROR, {
        message: 'Failed to evaluate clarification — please try again',
        context: 'clarification',
      });
    }
  }

  @SubscribeMessage('approach:submit')
  async handleApproach(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { sessionId: string; description: string },
  ) {
    try {
      const result = await this.sessionService.evaluateApproach(
        data.sessionId,
        data.description,
      );
      this.server.to(data.sessionId).emit(WsServerEvents.APPROACH_RESULT, result);

      if (result.advanceToImplementation) {
        this.server
          .to(data.sessionId)
          .emit(WsServerEvents.PHASE_CHANGE, { phase: 'IMPLEMENTATION' });
      }
    } catch (err) {
      this.server.to(data.sessionId).emit(WsServerEvents.SESSION_ERROR, {
        message: 'Failed to evaluate approach — please try again',
        context: 'approach',
      });
    }
  }

  @SubscribeMessage('hint:request')
  async handleHintRequest(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = await this.sessionService.getById(data.sessionId);
    if (session.mode === 'STRICT') {
      this.server.to(data.sessionId).emit(WsServerEvents.SESSION_ERROR, {
        message: 'Hints are disabled in strict mode',
        context: 'hint',
      });
      return;
    }

    let hintResult;
    try {
      hintResult = await this.sessionService.requestHint(data.sessionId);
    } catch (err: any) {
      const body = err?.response ?? {};
      if (body.code === 'INSUFFICIENT_XP') {
        this.server.to(data.sessionId).emit(WsServerEvents.SESSION_ERROR, {
          message: `Not enough XP — this hint costs ${body.xpNeeded} XP (you have ${body.xpBalance}).`,
          context: 'hint',
          xpNeeded: body.xpNeeded,
          xpBalance: body.xpBalance,
        });
      } else {
        this.server.to(data.sessionId).emit(WsServerEvents.SESSION_ERROR, {
          message: 'Failed to load hint — please try again',
          context: 'hint',
        });
      }
      return;
    }

    const { level, isCeiling, hintContent, problemStatement, context, xpBalance } = hintResult;

    if (hintContent) {
      this.server.to(data.sessionId).emit(WsServerEvents.AI_STREAM_CHUNK, { chunk: hintContent });
    } else {
      for await (const chunk of this.ai.streamHint(problemStatement, level, context, session.persona ?? 'STANDARD')) {
        this.server.to(data.sessionId).emit(WsServerEvents.AI_STREAM_CHUNK, { chunk });
      }
    }

    this.server.to(data.sessionId).emit(WsServerEvents.AI_STREAM_END, { level, isCeiling, xpBalance });
  }

  @SubscribeMessage('code:submit')
  async handleCodeSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; code: string; language: SupportedLanguage },
  ) {
    this.server.to(data.sessionId).emit(WsServerEvents.CODE_RUNNING, {});

    try {
      const result = await this.sessionService.submitCode(
        data.sessionId,
        data.code,
        data.language,
      );

      this.server.to(data.sessionId).emit(WsServerEvents.CODE_RESULT, result);
      this.server.to(data.sessionId).emit(WsServerEvents.PHASE_CHANGE, { phase: 'DEBRIEF' });

      void this.generateAndEmitDebrief(
        data.sessionId,
        data.code,
        data.language,
        { testsPassed: result.testsPassed, testsTotal: result.testsTotal },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Code execution service unavailable';
      this.server
        .to(data.sessionId)
        .emit(WsServerEvents.SESSION_ERROR, { message, context: 'submission' });
    }
  }

  // Periodic check-in during IMPLEMENTATION (GUIDED mode). Uses static prompts
  // to avoid per-checkin AI cost — variety comes from rotating through the list.
  private static readonly CHECKIN_PROMPTS = [
    'How is your implementation coming along? Any edge cases you want to call out?',
    'Take a moment to trace through the given example — does your current logic produce the right output?',
    'Are there any boundary conditions in the input your code might not handle yet?',
    'Think about your loop boundaries — are you confident about the termination condition?',
    'What would happen if every element in the input were the same value?',
  ];

  private checkinIndex = 0;

  @SubscribeMessage('checkin:request')
  handleCheckin(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const prompt = SessionGateway.CHECKIN_PROMPTS[
      this.checkinIndex++ % SessionGateway.CHECKIN_PROMPTS.length
    ];
    this.server.to(data.sessionId).emit(WsServerEvents.AI_STREAM_CHUNK, { chunk: prompt });
    this.server.to(data.sessionId).emit(WsServerEvents.AI_STREAM_END, { level: 0, isCeiling: false, type: 'checkin' });
  }

  private async generateAndEmitDebrief(
    sessionId: string,
    code: string,
    language: SupportedLanguage,
    result: { testsPassed: number; testsTotal: number },
  ) {
    try {
      const debrief = await this.sessionService.computeAndSaveDebrief({
        sessionId,
        code,
        language,
        testsPassed: result.testsPassed,
        testsTotal: result.testsTotal,
      });
      this.server.to(sessionId).emit('debrief:ready', debrief);
    } catch (err) {
      console.error('[debrief] generation failed:', err);
      this.server
        .to(sessionId)
        .emit(WsServerEvents.SESSION_ERROR, { message: 'Debrief generation failed' });
    }
  }
}
