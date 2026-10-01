/** Minimal ambient types for `svgstore` (no upstream/@types package exists). */
declare module 'svgstore' {
  interface SvgStore {
    add(id: string, svg: string): SvgStore;
    toString(options?: { inline?: boolean }): string;
  }

  interface SvgStoreOptions {
    cleanDefs?: boolean | string[];
    cleanSymbols?: boolean | string[];
    svgAttrs?: boolean | Record<string, unknown>;
    symbolAttrs?: boolean | Record<string, unknown>;
    copyAttrs?: boolean | string[];
    renameDefs?: boolean;
  }

  function svgstore(options?: SvgStoreOptions): SvgStore;
  export default svgstore;
}
