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
  createdAt: string;
  updatedAt: string;
}

export type CreateRecipeInput = Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export type UpdateRecipeInput = Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
