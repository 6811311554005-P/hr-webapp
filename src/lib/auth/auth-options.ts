import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { logAuditEvent } from "@/src/lib/audit/logger";

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const username = String(credentials.username);
          const password = String(credentials.password);
          const user = await prisma.user.findUnique({
            where: { email: username },
          });

          if (!user || !user.isActive) {
            await logAuditEvent({
              action: "AUTH_FAILED",
              entity: "User",
              statusCode: 401,
              metadata: { username },
            });
            return null;
          }

          const isPasswordValid = await compare(password, user.passwordHash);

          if (!isPasswordValid) {
            await logAuditEvent({
              action: "AUTH_FAILED",
              entity: "User",
              entityId: user.id,
              statusCode: 401,
              metadata: { username },
            });
            return null;
          }

          await logAuditEvent({
            action: "AUTH_LOGIN",
            entity: "User",
            entityId: user.id,
            statusCode: 200,
            metadata: { username, role: user.role },
          });

          return {
            id: user.id.toString(),
            email: user.email,
            username: user.email,
            role: user.role,
          };
        } catch {
          throw new Error("Authentication failed");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email ?? "";
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};
