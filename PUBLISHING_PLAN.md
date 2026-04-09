# SDK Publishing Plan

Date: 2026-04-09
Target package: etegram-pay-v2

## Release Strategy

1. Use semantic versioning.

- Patch: docs, bug fixes, non-breaking internals.
- Minor: additive features (new callback options, new optional fields).
- Major: breaking API or runtime contract changes.

2. Maintain two channels.

- Stable: `latest` tag.
- Pre-release: `next` tag for release candidates.

## Pre-Publish Checklist

1. Validate package metadata.

- `name`, `version`, `main`, `module`, `types`, `exports`, and `publishConfig.access`.

2. Validate build artifacts.

- Run `npm run build` and confirm output files:
  - `dist/index.js`
  - `dist/index.mjs`
  - `dist/index.d.ts`
  - `dist/index.d.mts`

3. Validate package contents.

- Run `npm run pack:dry-run` and verify only expected files are included.

4. Validate docs/snippets.

- Ensure README examples are copy-paste safe and match current API.

5. Validate changelog/release notes.

- Document added callbacks (`onSuccess`, `onClose`, aliases `onsuccess`, `onclose`) and behavior.

## Publish Commands

### Stable release

1. Bump version.

```bash
npm version patch
```

2. Push commit and tag.

```bash
git push && git push --tags
```

3. Publish.

```bash
npm publish --access public
```

### Pre-release (RC)

1. Bump prerelease version.

```bash
npm version prerelease --preid=rc
```

2. Publish to next channel.

```bash
npm publish --tag next --access public
```

## Post-Publish Verification

1. Confirm package metadata and files on npm.
2. Install in a clean sample app and run a smoke test.
3. Confirm ESM + CJS import paths work.
4. Confirm callback flow: onOpen -> onSuccess/onCancel/onError -> onClose.

## Rollback Plan

1. If issue is severe and immediate:

- Deprecate broken version.

```bash
npm deprecate etegram-pay-v2@<bad-version> "Deprecated due to critical issue; use <good-version>"
```

2. Publish a patch fix quickly.

- Create patch release and update release notes with migration guidance.
