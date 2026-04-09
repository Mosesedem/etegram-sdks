import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";

const tracks = [
  "WordPress Forms",
  "WooCommerce",
  "JavaScript/TypeScript",
  "Go",
  "Flutter",
  "React Native",
  "Kotlin",
  "Swift",
  "Python",
];

export default function HomePage() {
  return (
    <DocsShell>
      <h1>Etegram Documentation</h1>
      <p className="muted">
        A single frontend docs experience for every Etegram integration with
        shared webhook and authentication guidance.
      </p>

      <section className="hero" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>Build Focus</h2>
        <p>
          This UI starts with plugin-first documentation for WordPress and
          WooCommerce, then expands through all SDK tracks with consistent
          structure and production checklists.
        </p>
        <p className="meta">
          Status: Production-ready structure with operational checklists
        </p>
      </section>

      <section>
        <h2>Coverage Matrix</h2>
        <div className="grid">
          {tracks.map((track) => (
            <article key={track} className="card">
              <h3>{track}</h3>
              <p className="muted">
                Install, initialize, checkout, verify, webhook, and errors.
              </p>
              <p className="meta">Ready for sandbox-to-live rollout</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Start Here</h2>
        <p>
          Open <Link href="/docs/getting-started">Getting Started</Link> for
          credentials and flow setup, then continue to{" "}
          <Link href="/docs/webhooks-security">Webhooks and Security</Link>
          before implementing any framework page.
        </p>
      </section>
    </DocsShell>
  );
}
