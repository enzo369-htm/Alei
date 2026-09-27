import { NextResponse, type NextRequest } from "next/server";
import { HERO_COOKIE, HERO_IMAGES, nextHeroIndex } from "@/lib/hero";

function isFullPageLoad(request: NextRequest) {
  if (request.headers.get("RSC") === "1") return false;
  if (request.headers.get("Next-Router-Prefetch") === "1") return false;
  const purpose = request.headers.get("Purpose") ?? request.headers.get("Sec-Purpose");
  if (purpose === "prefetch") return false;
  return true;
}

export function middleware(request: NextRequest) {
  const lastRaw = request.cookies.get(HERO_COOKIE)?.value;
  const last = lastRaw === undefined ? undefined : Number(lastRaw);
  const lastSafe =
    last !== undefined && Number.isFinite(last) ? last : undefined;

  const index = isFullPageLoad(request)
    ? nextHeroIndex(lastSafe, HERO_IMAGES.length)
    : lastSafe !== undefined
      ? ((lastSafe % HERO_IMAGES.length) + HERO_IMAGES.length) %
        HERO_IMAGES.length
      : 0;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hero-index", String(index));

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isFullPageLoad(request)) {
    response.cookies.set(HERO_COOKIE, String(index), { path: "/" });
  }

  return response;
}

export const config = {
  matcher: "/",
};
