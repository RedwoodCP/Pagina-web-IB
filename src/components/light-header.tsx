import Link from "next/link";
import { Brand } from "./brand";

export function LightHeader({ action }: { action?: { href: string; label: string } }) {
  return (
    <header className="light-header">
      <Brand />
      {action && (
        <Link href={action.href} className="btn btn-secondary" style={{ height: 40, fontSize: 14, padding: "0 16px" }}>
          {action.label}
        </Link>
      )}
    </header>
  );
}
