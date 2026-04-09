import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";

export default function NotFound() {
  return (
    <DocsShell>
      <h1>Page Not Found</h1>
      <p className="muted">The page you requested does not exist yet.</p>
      <p>
        Return to <Link href="/docs">Documentation Index</Link>.
      </p>
    </DocsShell>
  );
}
