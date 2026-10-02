# SimpleCNC

A browser-based CNC toolpath generator built with React, TypeScript, and Vite.

## Local development

```sh
npm ci
npm run dev
```

Run the production build and tests with `npm run build` and `npm test`.

## Deploy to GitHub Pages

The GitHub Actions workflow builds and deploys the app whenever a commit is pushed to `main` (or when manually triggered).

1. In the repository on GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Push to `main`; after the workflow completes, the site will be available at `https://stephenharris.github.io/simplecnc/`.

Vite uses the repository name supplied by GitHub Actions as its base path, so this also supports GitHub Pages project sites.
