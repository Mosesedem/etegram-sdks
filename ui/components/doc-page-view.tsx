import { DocPage } from "@/lib/docs";

export function DocPageView({ page }: { page: DocPage }) {
  return (
    <>
      <h1>{page.title}</h1>
      <p className="muted">{page.summary}</p>
      <p className="meta" style={{ marginTop: 8 }}>
        Audience: {page.audience} | Last reviewed: {page.lastReviewed}
      </p>
      {page.sections.map((section) => (
        <section className="doc-section" key={section.title}>
          <h2 style={{ marginTop: 0 }}>{section.title}</h2>
          {section.summary ? (
            <p className="section-summary">{section.summary}</p>
          ) : null}

          {section.bullets && section.bullets.length > 0 ? (
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}

          {section.checklist && section.checklist.length > 0 ? (
            <div className="checklist">
              <h3>Production Checklist</h3>
              <ul>
                {section.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.codeExamples && section.codeExamples.length > 0
            ? section.codeExamples.map((example) => (
                <div key={example.title} className="code-example">
                  <p className="meta">{example.title}</p>
                  <pre>
                    <code>{example.code}</code>
                  </pre>
                </div>
              ))
            : null}
        </section>
      ))}
    </>
  );
}
