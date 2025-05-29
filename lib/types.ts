// Types for the registry API
export type RawRegistry = Record<string, string>; // <npmName> → "github:owner/repo"

export interface VersionInfo {
  git?: {
    repo: string;
    v0?: {
      version: string | null;
      branch: string | null;
    };
    v1?: {
      version: string | null;
      branch: string | null;
    };
  };
  npm?: {
    repo: string | null;
    v0?: string | null;
    v1?: string | null;
  };
  supports: {
    v0: boolean;
    v1: boolean;
  };
}

export interface CachedRegistry {
  lastUpdatedAt: string;
  registry: Record<string, VersionInfo>;
}

export interface NpmPackageMetadata {
  versions?: Record<string, unknown>;
  [key: string]: unknown;
}
