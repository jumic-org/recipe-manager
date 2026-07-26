export interface Ingredient {
  amount: number;
  unit: string;
  name: string;
  group: string | null;
}

export interface Instruction {
  stepNumber: number;
  text: string;
}

export interface NutritionalInfo {
  calories: number | null;
  protein: string | null;
  carbohydrates: string | null;
  fat: string | null;
}

export interface Recipe {
  id: string;
  userId: string;
  entityType: 'recipe';
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  categories: string[];
  tags: string[];
  imageKeys: string[];
  nutritionalInfo: NutritionalInfo | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateRecipeInput = Omit<Recipe, 'id' | 'userId' | 'entityType' | 'createdAt' | 'updatedAt'>;

export type UpdateRecipeInput = Omit<Recipe, 'id' | 'userId' | 'entityType' | 'createdAt' | 'updatedAt'>;

export interface IngredientOnHand {
  id: string;
  userId: string;
  entityType: 'ingredientOnHand';
  name: string;
  createdAt: string;
}

export type CreateIngredientOnHandInput = Omit<IngredientOnHand, 'id' | 'userId' | 'entityType' | 'createdAt'>;

export interface Aisle {
  name: string;
  comment?: string;
}

export interface Supermarket {
  id: string;
  userId: string;
  entityType: 'supermarket';
  name: string;
  aisles: Aisle[];
  createdAt: string;
  updatedAt: string;
}

export type CreateSupermarketInput = Omit<Supermarket, 'id' | 'userId' | 'entityType' | 'createdAt' | 'updatedAt'>;

export type UpdateSupermarketInput = Omit<Supermarket, 'id' | 'userId' | 'entityType' | 'createdAt' | 'updatedAt'>;
