import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/works", label: "works" },
  { href: "/about", label: "about" },
  { href: "/colabs", label: "colabs" },
] as const;

export function Navbar() {
  return (
    <nav
      className="relative z-20 flex h-[58px] w-full shrink-0 items-center justify-between bg-white text-[15.5px] text-black"
      style={{ paddingLeft: 50, paddingRight: 50 }}
    >
      <Link href="/" className="tracking-wide">
        ALEI
      </Link>
      <ul className="flex items-center gap-6">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
