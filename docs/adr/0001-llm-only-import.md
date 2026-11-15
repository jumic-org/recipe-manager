# Import uses an LLM only, with no JSON-LD path

Imported pages are turned into a Recipe by sending the page text to an LLM on AWS Bedrock. We do not parse the schema.org `Recipe` JSON-LD that many sites (including Chefkoch and Gaumenfreundin) provide, even though that would be cheaper and more predictable for those sites. One generic path works for every site, including those without structured data, and the Import Preview lets the user catch extraction errors before saving.

## Consequences

- Every import costs Bedrock tokens and can mis-extract or drop an ingredient. The user is expected to review the Import Preview.
- If the page cannot be fetched (blocked, or content loaded by JavaScript), the user pastes the recipe text instead. It goes through the same LLM path.
