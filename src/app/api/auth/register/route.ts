import { authenticate } from "@/lib/server";

export async function POST(request: Request) {
  return authenticate("/tenants/register", await request.text());
}
