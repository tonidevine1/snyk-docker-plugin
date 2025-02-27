import { DepGraph } from "@snyk/dep-graph";
import { JarFingerprint } from "./analyzer/types";
import { DockerFileAnalysis } from "./dockerfile/types";
import { ManifestFile } from "./types";

export interface DepGraphFact {
  type: "depGraph";
  data: DepGraph;
}

export interface KeyBinariesHashesFact {
  type: "keyBinariesHashes";
  data: string[];
}

export interface ImageLayersFact {
  type: "imageLayers";
  data: string[];
}

export interface DockerfileAnalysisFact {
  type: "dockerfileAnalysis";
  data: DockerFileAnalysis;
}

export interface RootFsFact {
  type: "rootFs";
  data: string[];
}

export interface AutoDetectedUserInstructionsFact {
  type: "autoDetectedUserInstructions";
  data: DockerFileAnalysis;
}
export interface ImageIdFact {
  type: "imageId";
  data: string;
}

export interface ImageOsReleasePrettyNameFact {
  type: "imageOsReleasePrettyName";
  data: string;
}

export interface ImageManifestFilesFact {
  type: "imageManifestFiles";
  data: ManifestFile[];
}

export interface TestedFilesFact {
  type: "testedFiles";
  data: string[];
}

export interface JarFingerprintsFact {
  type: "jarFingerprints";
  data: {
    fingerprints: JarFingerprint[];
    origin: string;
    path: string;
  };
}

export interface ImageLabels {
  type: "imageLabels";
  data: {
    [key: string]: string;
  };
}

export interface ImageSizeBytesFact {
  type: "imageSizeBytes";
  data: number;
}
