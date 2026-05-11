import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { JWT } from 'next-auth/jwt';

function secretBytes(secret: string | string[]): Uint8Array {
  return new TextEncoder().encode(Array.isArray(secret) ? secret[0] : secret);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],

  session: { strategy: 'jwt' },

  // Replace NextAuth's default JWE with standard HS256 so the NestJS API
  // can verify the same token using the shared AUTH_SECRET.
  jwt: {
    encode: async ({ token, secret, maxAge }) =>
      new SignJWT(token as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + (maxAge ?? 30 * 24 * 60 * 60))
        .sign(secretBytes(secret)),

    decode: async ({ token, secret }) => {
      if (!token) return null;
      try {
        const { payload } = await jwtVerify(token, secretBytes(secret));
        return payload as JWT;
      } catch {
        return null;
      }
    },
  },

  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },

    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;

      // Mint a short-lived token the client passes to the NestJS API.
      session.apiToken = await new SignJWT({
        sub: token.sub,
        email: token.email,
        name: token.name,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));

      return session;
    },
  },

  pages: { signIn: '/login' },
});
