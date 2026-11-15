import type { PageFetcher, PhotoStorage, RecipeExtractor } from "../src/ports";

/** Bedrock stand-in: answers every request with a canned response. */
export function fakeRecipeExtractor(response: unknown): RecipeExtractor {
  return { extract: async () => response };
}

/** Page fetching stand-in: serves stored HTML by URL and fails for anything else. */
export function fakePageFetcher(pages: Record<string, string>): PageFetcher {
  return {
    fetch: async (url) => {
      const html = pages[url];
      if (html === undefined) throw new Error(`No stored page for ${url}`);
      return html;
    },
  };
}

/** S3 stand-in: hands out predictable upload addresses. */
export function fakePhotoStorage(): PhotoStorage {
  return { createUploadUrl: async (key) => `https://photos.test/upload/${key}` };
}
