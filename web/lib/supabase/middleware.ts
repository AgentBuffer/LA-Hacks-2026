import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth middleware when Supabase is not configured (mock mode)
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  if (!user && !isAuthPage && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // First-time users (no brand row yet) get routed to onboarding instead of
  // a stale /calendar empty state. Signup → email-verify → login otherwise
  // skips /onboard entirely.
  async function brandTarget(): Promise<string> {
    const orgId =
      (user?.app_metadata as Record<string, unknown> | undefined)?.org_id ??
      (user?.user_metadata as Record<string, unknown> | undefined)?.org_id;
    if (!orgId) return "/dashboard/onboard";
    const { data: brandRow } = await supabase
      .from("brands")
      .select("id")
      .eq("org_id", orgId as string)
      .limit(1)
      .maybeSingle();
    return brandRow ? "/dashboard/calendar" : "/dashboard/onboard";
  }

  if (
    user &&
    request.nextUrl.pathname.startsWith("/dashboard") &&
    request.nextUrl.pathname !== "/dashboard/onboard"
  ) {
    const target = await brandTarget();
    if (target === "/dashboard/onboard") {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = await brandTarget();
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
