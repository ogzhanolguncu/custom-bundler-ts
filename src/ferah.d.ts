export declare module Ferahpack {
  export type CreateAsset = {
    id: number;
    filePath: string;
    dependencies: string[];
    code: string | undefined;
    mapping?: any;
  };
  export type FileExtension = 'ts' | 'js';
}
