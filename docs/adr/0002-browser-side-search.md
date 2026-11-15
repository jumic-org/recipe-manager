# Search runs in the browser over a loaded index

The app loads a search index of the whole Collection (titles, tags, ingredients) into the browser and searches it there, for example with MiniSearch. We chose this over OpenSearch because a search cluster costs money even when idle, which does not fit a two-user serverless app. It stays fast for hundreds of recipes. If the Collection grows to several thousand, this needs revisiting.
