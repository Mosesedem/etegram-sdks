"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "@/lib/docs";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="page-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Documentation navigation">
        <div className="brand">Etegram Docs</div>
        <div className="meta">Multi-SDK + Plugins</div>
        <ul className="nav-list" style={{ marginTop: 14 }}>
          {docsNav.map((item) => (
            <li key={item.href} className="nav-item">
              <Link
                href={item.href}
                className={pathname === item.href ? "active-link" : undefined}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <main id="content" className="main-panel">
        {children}
      </main>
    </div>
  );
}
