import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id: number;
      role: 'admin' | 'user' | 'pending';
      name: string | null;
      image: string | null;
      githubLogin: string | null;
      isPending: boolean;
    };
  }

  interface User {
    id?: number;
    role?: 'admin' | 'user' | 'pending';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: number;
    role?: 'admin' | 'user' | 'pending';
    githubLogin?: string | null;
  }
}
