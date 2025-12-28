# TrackOS (offline-first PWA)

Personal performance tracker that runs **fully offline** after first load. Data is stored locally in **IndexedDB** (Dexie). No auth. No external APIs.

## How to run

```bash
npm install
npm run dev
```

Build + preview:

```bash
npm run typecheck
npm run build
npm run preview
```

## Test offline (Chrome)

- Run `npm run dev` or `npm run preview`
- Open DevTools → **Application** → **Service Workers** (confirm one is registered)
- DevTools → **Network** → check **Offline**
- Refresh: app should still load (app shell cached); your data remains in IndexedDB.

## Backup / restore

Go to **Settings → Backup**:
- **Export JSON**: downloads a local file (never uploaded anywhere)
- **Encrypt export**: optional passphrase-based AES-GCM encryption (WebCrypto)
- **Import JSON (replace)**: restores by replacing local IndexedDB contents

## Notes

- App shell is cached by the service worker; **user data is not stored in cache** (it’s in IndexedDB).
- Schema versioning is stored in `settings.schemaVersion` and in backup files.


