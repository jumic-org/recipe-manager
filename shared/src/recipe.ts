/** One line of the ingredient list, free text (see GLOSSARY.md). */
export type Ingredient = string;

/** An optional named section of the ingredient list, such as "Für den Teig". */
export interface IngredientGroup {
  /** Absent for the unnamed main list. */
  name?: string;
  ingredients: Ingredient[];
}

export interface Recipe {
  id: string;
  title: string;
  ingredientGroups: IngredientGroup[];
  /** Ordered preparation steps. */
  steps: string[];
  /** Free text, such as "4 Portionen". */
  servings?: string;
  /** Minutes. */
  prepTimeMinutes?: number;
  /** Minutes. */
  totalTimeMinutes?: number;
  /** Linked image address, replaced by a Photo when one is uploaded. */
  imageUrl?: string;
  /** S3 key of an uploaded Photo. */
  photoKey?: string;
  sourceUrl?: string;
  /** Shared note, free text. */
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Response of `GET /recipes`. */
export interface ListRecipesResponse {
  recipes: Recipe[];
}
