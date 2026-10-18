import { authenticate } from "@/lib/server";

export async function POST(request: Request) {
  return authenticate("/auth/login", await request.text());
}
