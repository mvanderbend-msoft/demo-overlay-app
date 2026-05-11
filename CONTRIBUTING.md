# Contributing to demo-overlay-app

Thanks for taking the time to contribute! This project is a small Electron app
that puts a transparent lower-third banner over whatever app you're presenting,
so you can step through a demo or tutorial with global keyboard shortcuts.
Contributions of any size are welcome — bug reports, new animations, hero
finale tweaks, packaging improvements, docs fixes, all of it.

## Getting started

```sh
git clone https://github.com/mvanderbend-msoft/demo-overlay-app.git
cd demo-overlay-app
npm install
npm start
```

The overlay opens centered at the bottom of your primary display. Edit
`sections.json` (seeded from `sections.example.json` on first run) and the
overlay hot-reloads.

## Reporting bugs

Please open an issue using the **Bug report** template and include:

- Your OS + version (Windows 11, macOS 14, …)
- Electron / Node version (`npx electron --version`, `node --version`)
- A clear repro and what you expected to happen
- A screenshot or short clip if it's a visual glitch

## Suggesting features

Use the **Feature request** template. The bar is roughly: "does this help
someone running a live demo, talk, or tutorial?" If yes, it's probably in
scope.

## Pull requests

1. Fork and create a topic branch off `main`.
2. Keep changes focused — one logical change per PR.
3. Don't commit `sections.json` (it's gitignored for a reason).
4. Don't commit secrets — the GitHub PAT lives encrypted in the user data
   folder, never in the repo.
5. Test locally with `npm start` before opening the PR. There is no automated
   test suite yet; manual verification is fine.
6. Update `README.md` if your change affects user-visible behavior (hotkeys,
   config, settings UI).
7. Fill in the PR template so reviewers know what to look at.

## Code style

- Plain JavaScript, no transpiler. Match the surrounding style.
- 2-space indentation, single quotes, semicolons.
- Keep `main.js` (Electron main process) and renderer code clearly separated;
  use the existing `preload.js` IPC bridge — don't enable `nodeIntegration`.

## Releasing (maintainers)

Tagged releases on `main` trigger the `release` workflow, which builds a
Windows installer via `electron-builder` and attaches it to the GitHub
Release:

```sh
npm version patch   # or minor / major
git push --follow-tags
```

## License

By contributing, you agree that your contributions will be licensed under the
MIT License (see [`LICENSE`](LICENSE)).
