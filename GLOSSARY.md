# Recipe Manager

A private app for a family to keep their recipes in one place. Recipes are either imported from web pages, without the ads and scrolling, or entered by hand.

## Language

**Recipe**:
A dish with a title, ingredients, steps, servings, times, an image, a source URL and notes. It stays in the language of its source and is never translated.
_Avoid_: Dish, meal

**Collection**:
All recipes that belong to the family. There is exactly one, and every user sees and edits all of it.
_Avoid_: Library, cookbook, workspace

**User**:
A person with their own username and password who can access the collection.
_Avoid_: Member, account, family member

**Ingredient**:
One line in a recipe's ingredient list, kept as free text. It is not split into amount, unit and name.
_Avoid_: Item, component

**Ingredient Group**:
An optional named section of the ingredient list, such as "Für den Teig".
_Avoid_: Section, category

**Step**:
One instruction in the preparation of a recipe, in order.
_Avoid_: Direction, instruction

**Favorite**:
A recipe a user has starred for themselves. It is personal: one user's favorites are not visible to others.
_Avoid_: Bookmark, like

**Photo**:
An image a user uploads for a recipe. It replaces the image URL the import found, if there was one.
_Avoid_: Picture, attachment

**Source URL**:
The web address of the page a recipe was imported from. It is shown on the recipe.
_Avoid_: Origin, link

**Note**:
Free text a user adds to a recipe for their own adjustments, such as "weniger Salz".
_Avoid_: Comment, remark

**Tag**:
A free-form label on a recipe, such as "vegetarisch" or "Baby", used to find recipes.
_Avoid_: Category, label

**Import**:
Creating a recipe from a web page address, or from pasted text when the page cannot be fetched, using an LLM to read the recipe out of it.
_Avoid_: Scrape, crawl, clip

**Import Preview**:
The recipe as the import extracted it, shown for review and correction. It is not saved until the user confirms it.
_Avoid_: Draft
