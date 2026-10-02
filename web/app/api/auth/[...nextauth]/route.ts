/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_WEB_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "john.doe@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawIdentifier =
          (typeof credentials?.identifier === "string" && credentials.identifier.trim()) ||
          (typeof credentials?.email === "string" && credentials.email.trim());

        if (!rawIdentifier || !credentials.password) {
          console.error("Credentials missing");
          return null;
        }

        try {
          const res = await fetch(`${process.env.BACKEND_API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: rawIdentifier,
              identifier: rawIdentifier,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error("Credentials login failed:", errorData.msg || res.statusText);
            throw new Error(errorData.msg || "Invalid credentials");
          }

          const data = await res.json();

          if (data.user && data.token) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              sellerId: data.user.sellerId || null, // For Store Managers
              backendToken: data.token
            };
          } else {
            console.error("Credentials login response missing user or token:", data);
            return null;
          }
        } catch (error) {
          const err = error as Error;
          console.error("Authorize error:", err.message);
          throw new Error(err.message || "Login failed due to an internal error.");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const idToken = (account as any)?.id_token as string | undefined;
          if (!idToken) {
            console.error("Google id_token missing from account; cannot authenticate with backend");
            return false;
          }

          const res = await fetch(`${process.env.BACKEND_API_URL}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              rememberMe: false,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error("Backend error during Google user find/create:", errorData.msg || res.statusText);
            return false;
          }

          const data = await res.json(); 

          // Augment the `user` object (which is of type `next-auth.User`)
          // This `user` object is then passed to the `jwt` callback.
          user.id = data.user.id;
          user.name = data.user.name;
          user.email = data.user.email;
          user.role = data.user.role;
          user.image = data.user.profileImage || user.image;
          user.backendToken = data.token;

          return true; 
        } catch (error) {
          console.error("Error in Google signIn callback:", error);
          return false; 
        }
      }
      if (account?.provider === "credentials") {
        // `user` here is the object returned by `authorize`
        return true;
      }
      return false;
    },

    async jwt({ token, user }) {

      if (user) {
        token.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role ?? null,
          ...(user.sellerId && { sellerId: user.sellerId }),
        };
        if (user.backendToken) {
          token.backendToken = user.backendToken;
        }
      }
      return token;
    },
    
    async session({ session, token }) {
      
      const tokenUser = token.user as { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string | null; sellerId?: string | null } | undefined;
      
      session.user = {
        ...session.user,
        id: tokenUser?.id as string,
        role: tokenUser?.role as string | null,
        ...(tokenUser?.sellerId && { sellerId: tokenUser.sellerId }),
        image: tokenUser?.image || token.picture
      };
      
      if (token.backendToken) {
        session.backendToken = token.backendToken;
      }
      return session;
    },
    
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
