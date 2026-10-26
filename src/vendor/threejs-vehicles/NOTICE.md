# Vendored threejs-vehicles fighter generator

- Upstream: [AskAlice/threejs-worldgen](https://github.com/AskAlice/threejs-worldgen), `packages/vehicles` v0.1.0.
- Files: `mesh.js` (trimmed `MeshBuilder`) and `fighter.js` (the `fighterJet()` generator and `wings()` helper).
- License: Apache License 2.0, see `LICENSE` in this directory.
- Changes: TypeScript types removed; the upstream mesh palette is applied directly; nav-light and exhaust metadata are returned for the host's glow panels; the model is used only for low-poly NPC escorts.
