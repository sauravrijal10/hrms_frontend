import { TOKEN_COOKIE } from "@/lib/config";
import { authenticate, getToken, problem } from "@/lib/server";

/** Changes the signed-in user's password and swaps in the fresh token the API returns. */
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return problem(401, "Your session has expired. Please sign in again.");
  return authenticate("/auth/change-password", await request.text(), TOKEN_COOKIE, token);
}
