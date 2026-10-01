/// <reference types="vite/client" />

declare module 'virtual:chronicle' {
  import type { ChronicleCommit } from '../vite.config.ts';

  const commits: ChronicleCommit[];
  export default commits;
}
