import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isProtectedRoute = ["/", "/escalar", "/perfil", "/como-funciona"].some((route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`));

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirecionar", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return response;
}
