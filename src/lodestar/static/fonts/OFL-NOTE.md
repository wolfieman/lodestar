# Self-hosted web fonts — provenance & license

These woff2 files are **staged for the Cloudflare Worker cutover** (decision #8:
Google Fonts CDN now, self-hosted woff2 at the Worker migration). The live
Namecheap deploy still loads these faces from the Google Fonts CDN; nothing in
`index.html` references this directory yet. See `worker/FONT-SWAP.md` for the
ready-to-apply `index.html` diff that activates these files at cutover.

## Files

| File                    | Family | Weight(s)        | Subset | Source `unicode-range` (latin)                                                                 |
| ----------------------- | ------ | ---------------- | ------ | --------------------------------------------------------------------------------------------- |
| `cinzel-700-latin.woff2`| Cinzel | 700 (bold)       | latin  | `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD` |
| `inter-latin.woff2`     | Inter  | 400 / 500 / 600  | latin  | same latin range as above                                                                     |

Notes:

- Only the **latin** unicode-range subset is staged (the live UI copy is Latin
  text; "résumés" uses U+00E9 and the em dash U+2014 both fall inside the latin
  range above). The latin-ext / cyrillic / greek / vietnamese subsets are not
  needed and are intentionally omitted to keep the payload small.
- **Inter is a variable font on Google Fonts:** weights 400, 500, and 600 all
  resolve to the *same* latin woff2, so a single `inter-latin.woff2` serves all
  three. The `@font-face` block in `worker/FONT-SWAP.md` points the 400/500/600
  faces at this one file.
- Subset hashes are pinned to the versions Google Fonts served at staging time
  (Cinzel `v26`, Inter `v20`). Re-fetch from the `css2` API with a woff2-capable
  User-Agent if you need to refresh.

## License

Both families are distributed under the **SIL Open Font License, Version 1.1**.
The OFL permits bundling and self-hosting the font files (including subsets);
the only requirements are that the fonts not be sold by themselves and that this
license/attribution notice travels with them.

- **Cinzel** — Copyright (c) Natanael Gama (Ndiscover), under the SIL OFL 1.1.
- **Inter** — Copyright (c) The Inter Project Authors (https://github.com/rsms/inter),
  under the SIL OFL 1.1.

Full license text: https://openfontlicense.org/open-font-license-official-text/
