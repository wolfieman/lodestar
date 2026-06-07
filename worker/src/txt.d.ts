// Ambient typings for .txt imports resolved by the wrangler Text rule
// (wrangler.jsonc: rules [{ type: "Text", globs: ["**/*.txt"] }]). esbuild
// inlines the file contents as a default-exported string at build time.
declare module "*.txt" {
  const content: string;
  export default content;
}
