/**
 * The edges of the backend. Business logic and DynamoDB run for real in tests;
 * these are replaced by fakes (see test/fakes.ts).
 */

/** Reads a Recipe out of page text, using an LLM on Bedrock. Returns unvalidated JSON. */
export interface RecipeExtractor {
  extract(text: string): Promise<unknown>;
}

/** Downloads a public web page and returns its HTML. */
export interface PageFetcher {
  fetch(url: string): Promise<string>;
}

/** Issues short-lived signed upload addresses for Photos. */
export interface PhotoStorage {
  createUploadUrl(key: string): Promise<string>;
}
