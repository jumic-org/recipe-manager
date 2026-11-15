import type { PageFetcher, PhotoStorage, RecipeExtractor } from '../src/ports';

/** Bedrock stand-in: answers every request with a canned response. */
export function fakeRecipeExtractor(response: unknown): RecipeExtractor {
  return { extract: () => Promise.resolve(response) };
}

/** Page fetching stand-in: serves stored HTML by URL and fails for anything else. */
export function fakePageFetcher(pages: Record<string, string>): PageFetcher {
  return {
    fetch: (url) => {
      const html = pages[url];
      if (html === undefined) return Promise.reject(new Error(`No stored page for ${url}`));
      return Promise.resolve(html);
    },
  };
}

/** S3 stand-in: hands out predictable upload addresses. */
export function fakePhotoStorage(): PhotoStorage {
  return { createUploadUrl: (key) => Promise.resolve(`https://photos.test/upload/${key}`) };
}
