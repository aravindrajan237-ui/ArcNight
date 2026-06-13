import { handle, ok, parseBody, ApiError } from "@/lib/api";
import { signupSchema } from "@/lib/validation";
import { usernameToEmail } from "@/lib/auth-username";
import { createAdminClient } from "@/lib/supabase/admin";

// Creates auth users per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/signup — create a username/password account with NO email.
 * Uses the admin API with email_confirm:true (so no confirmation email is
 * sent and the account can sign in immediately via signInWithPassword).
 */
export const POST = handle(async (req) => {
  const { username, password } = await parseBody(req, signupSchema);
  const email = usernameToEmail(username);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    if (/already|exists|registered|duplicate/i.test(error.message)) {
      throw new ApiError(409, "That username is already taken");
    }
    throw new ApiError(400, error.message);
  }

  return ok({ created: true }, 201);
});
