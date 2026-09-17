declare module "urdf-loader" {
  import type { LoadingManager, Object3D } from "three";

  export default class URDFLoader {
    manager: LoadingManager;
    packages: string | Record<string, string> | ((pkg: string) => string);
    workingPath: string;
    fetchOptions: RequestInit;
    parseVisual: boolean;
    parseCollision: boolean;
    loadMeshCb: (
      path: string,
      manager: LoadingManager,
      done: (mesh: Object3D, err?: Error) => void,
    ) => void;
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (robot: Object3D & { setJointValue: (name: string, value: number) => void }) => void,
      onProgress?: (e: ProgressEvent) => void,
      onError?: (err: unknown) => void,
    ): void;
    loadAsync(url: string): Promise<Object3D>;
    parse(content: string): Object3D;
  }
}
