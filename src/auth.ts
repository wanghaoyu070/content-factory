import NextAuth from 'next-auth/next';
import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import GitHubProvider from 'next-auth/providers/github';
import {
  createUser,
  getUserByGithubId,
  getUsersCount,
  getUserById,
} from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'github' && profile) {
        const githubId = String((profile as Record<string, unknown>).id || account.providerAccountId);
        let user = getUserByGithubId(githubId);

        if (!user) {
          const usersCount = getUsersCount();
          const role = usersCount === 0 ? 'admin' : 'pending';
          const newUserId = createUser({
            githubId,
            githubLogin: (profile as Record<string, unknown>).login as string | undefined,
            name: (profile as Record<string, unknown>).name as string | undefined,
            email: (profile as Record<string, unknown>).email as string | undefined,
            avatarUrl: (profile as Record<string, unknown>).avatar_url as string | undefined,
            role,
          });
          user = getUserById(newUserId);
        }

        if (user) {
          token.userId = user.id;
          token.role = user.role;
          token.name = user.name || user.github_login || token.name;
          token.picture = user.avatar_url || token.picture;
          token.githubLogin = user.github_login;
          token.onboardingCompleted = user.onboarding_completed === 1;
        }
      } else if (token.userId) {
        const user = getUserById(token.userId as number);
        if (user) {
          token.role = user.role;
          token.name = user.name || user.github_login || token.name;
          token.picture = user.avatar_url || token.picture;
          token.githubLogin = user.github_login;
          token.onboardingCompleted = user.onboarding_completed === 1;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.userId) {
        session.user = {
          ...(session.user || {}),
          id: token.userId as number,
          role: (token.role as string) || 'user',
          name: (token.name as string) || session.user?.name || null,
          image: (token.picture as string) || session.user?.image || null,
          githubLogin: (token.githubLogin as string) || null,
          isPending: token.role === 'pending',
          onboardingCompleted: (token.onboardingCompleted as boolean) || false,
        } as typeof session.user;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export function auth() {
  return getServerSession(authOptions);
}
