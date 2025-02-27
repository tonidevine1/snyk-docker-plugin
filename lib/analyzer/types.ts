import { DockerFileAnalysis } from "../dockerfile";
import { ManifestFile } from "../types";
import { AppDepsScanResultWithoutTarget } from "./applications/types";

export interface AnalyzedPackage {
  Name: string;
  Version?: string;
  Source?: string;
  Provides: string[];
  Deps: {
    [name: string]: any;
  };
  AutoInstalled?: boolean;
}

export interface DockerInspectOutput {
  Id: string;
  Architecture: string;
  RootFS: {
    Type: string;
    Layers: string[];
  };
}

export interface ImageAnalysis {
  Image: string;
  AnalyzeType: AnalysisType;
  Analysis: AnalyzedPackage[] | Binary[];
}

export enum AnalysisType {
  Apk = "Apk",
  Apt = "Apt",
  Rpm = "Rpm",
  Binaries = "binaries",
  Linux = "linux", // default/unknown/tech-debt
}

export interface OSRelease {
  name: string;
  version: string;
  prettyName: string;
}

export interface Binary {
  name: string;
  version: string;
}

export interface IAptFiles {
  dpkgFile: string;
  extFile: string;
}

export interface DynamicAnalysis {
  imageId: string;
  platform?: string;
  osRelease: OSRelease;
  results: ImageAnalysis[];
  binaries: ImageAnalysis;
  imageLayers: string[];
}

export interface JarFingerprint {
  location: string;
  digest: string;
}

export interface StaticAnalysis {
  imageId: string;
  platform?: string;
  osRelease: OSRelease;
  results: ImageAnalysis[];
  binaries: string[];
  imageLayers: string[];
  rootFsLayers?: string[];
  autoDetectedUserInstructions?: DockerFileAnalysis;
  applicationDependenciesScanResults: AppDepsScanResultWithoutTarget[];
  manifestFiles: ManifestFile[];
  imageLabels?: { [key: string]: string };
}

export interface ArchiveResult {
  path: string;
  removeArchive(): void;
}

export interface ImageDetails {
  hostname: string;
  imageName: string;
  tag: string;
}

export interface DestinationDir {
  name: string;
  removeCallback: () => void;
}
