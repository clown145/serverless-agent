export type BlobStorageBackend = "r2" | "s3" | "d1_lite";

export type BlobPutOptions = {
  contentType?: string;
};

export type BlobObject = {
  key: string;
  size: number;
  contentType?: string;
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type BlobHead = {
  key: string;
  size: number;
  contentType?: string;
};

export type BlobStorage = {
  backend: BlobStorageBackend;
  put(key: string, value: string | Uint8Array | ArrayBuffer, options?: BlobPutOptions): Promise<void>;
  get(key: string): Promise<BlobObject | undefined>;
  head(key: string): Promise<BlobHead | undefined>;
  delete(key: string): Promise<void>;
};
