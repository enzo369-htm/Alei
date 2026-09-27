import { headers } from "next/headers";
import { Hero } from "@/components/Hero";
import { HERO_IMAGES } from "@/lib/hero";

export default async function HomePage() {
  const headerStore = await headers();
  const raw = Number(headerStore.get("x-hero-index") ?? 0);
  const index = Number.isFinite(raw)
    ? ((raw % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length
    : 0;

  return (
    <div className="h-[calc(100dvh-58px)] overflow-hidden">
      <Hero src={HERO_IMAGES[index]} />
    </div>
  );
}
