import "server-only";
import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { isAllowedGithubId } from "./admin-allowlist";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      // 숫자 id만 필요하므로 이메일 scope 제외
      authorization: { params: { scope: "read:user" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: {
    // allowlist 불일치는 false로 거부하며 사유를 URL이나 화면에 노출하지 않음
    async signIn({ account }) {
      return (
        account?.provider === "github" &&
        isAllowedGithubId(account.providerAccountId)
      );
    },
    async jwt({ token, account }) {
      if (account?.provider === "github") {
        token.githubId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.githubId === "string") {
        session.user.githubId = token.githubId;
      }
      return session;
    },
  },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
