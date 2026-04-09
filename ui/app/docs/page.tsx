import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";
import { docsPages } from "@/lib/docs";

export default function DocsIndexPage() {
  return (
    <DocsShell>
      <h1>Documentation Index</h1>
      <p className="muted">
        Browse implementation tracks and shared core references for
        authentication and webhook handling.
      </p>

      <div className="grid" style={{ marginTop: 16 }}>
        {docsPages.map((page) => (
          <article key={page.slug} className="card">
            <h3>
              <Link href={`/docs/${page.slug}`}>{page.title}</Link>
            </h3>
            <p className="muted">{page.summary}</p>
            <p className="meta">Audience: {page.audience}</p>
            <p className="meta">Last reviewed: {page.lastReviewed}</p>
          </article>
        ))}
      </div>
    </DocsShell>
  );
}
