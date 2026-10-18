import { PLATFORM_TOKEN_COOKIE } from "@/lib/config";
import { authenticate } from "@/lib/server";

export async function POST(request: Request) {
  return authenticate("/platform/auth/login", await request.text(), PLATFORM_TOKEN_COOKIE);
}
