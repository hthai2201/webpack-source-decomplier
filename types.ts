export interface Config {
  inputDir: string;
  baseUrl: string;
  baseOutputDir: string;
  mapsDir: string;
  decompiledDir: string;
  exts: string[];
  webpackPrefix?: string; // Webpack prefix for module paths, e.g. "_N_E"
}
