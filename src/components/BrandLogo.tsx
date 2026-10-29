import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="Sage admin home">
      <Image className="brand-image" src="/brand/sage-logo.png" alt="SAGE Logo" width={44} height={44} priority />
      <span className="brand-name">SAGE</span>
      <span className="brand-descriptor">
        EDUCATIONAL
        <br />
        SESSION
      </span>
    </Link>
  );
}
