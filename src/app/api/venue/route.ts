import { guard, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateVenue } from "@/lib/repo";

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    return json(user.venue);
  });
}

export async function PATCH(req: Request) {
  return guard(async () => {
    const user = await requireUser();
    const patch = (await req.json()) as Record<string, unknown>;
    const venue = await updateVenue(user.venueId, patch);
    return json(venue);
  });
}
