import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateRecipeInput } from '@recipe-manager/shared';
import { RecipeService } from './recipe.service';

@Component({
  selector: 'rm-recipe-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="form-container">
      <h2>{{ isEdit ? 'Edit Recipe' : 'New Recipe' }}</h2>
      @if (loading) {
        <p class="loading">Loading...</p>
      }
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-section">
          <div class="form-field">
            <label for="title">Title</label>
            <input id="title" type="text" formControlName="title" placeholder="Recipe title" />
          </div>
          <div class="form-field">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              placeholder="Brief description"
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label for="servings">Servings</label>
              <input id="servings" type="number" formControlName="servings" min="1" />
            </div>
            <div class="form-field">
              <label for="prepTime">Prep Time (min)</label>
              <input id="prepTime" type="number" formControlName="prepTimeMinutes" min="0" />
            </div>
            <div class="form-field">
              <label for="cookTime">Cook Time (min)</label>
              <input id="cookTime" type="number" formControlName="cookTimeMinutes" min="0" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3>Ingredients</h3>
            <button type="button" class="btn-add" (click)="addIngredient()">+ Add</button>
          </div>
          <div formArrayName="ingredients">
            @for (ing of ingredientsArray.controls; track $index; let i = $index) {
              <div class="ingredient-row" [formGroupName]="i">
                <input type="number" formControlName="amount" placeholder="Amt" class="input-sm" />
                <input type="text" formControlName="unit" placeholder="Unit" class="input-sm" />
                <input
                  type="text"
                  formControlName="name"
                  placeholder="Ingredient name"
                  class="input-lg"
                />
                <input
                  type="text"
                  formControlName="group"
                  placeholder="Group (optional)"
                  class="input-md"
                />
                <button type="button" class="btn-remove" (click)="removeIngredient(i)">x</button>
              </div>
            }
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3>Instructions</h3>
            <button type="button" class="btn-add" (click)="addInstruction()">+ Add</button>
          </div>
          <div formArrayName="instructions">
            @for (inst of instructionsArray.controls; track $index; let i = $index) {
              <div class="instruction-row" [formGroupName]="i">
                <span class="step-number">{{ i + 1 }}.</span>
                <textarea formControlName="text" rows="2" placeholder="Step description"></textarea>
                <div class="instruction-actions">
                  <button
                    type="button"
                    class="btn-move"
                    [disabled]="i === 0"
                    (click)="moveInstruction(i, -1)"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    class="btn-move"
                    [disabled]="i === instructionsArray.length - 1"
                    (click)="moveInstruction(i, 1)"
                  >
                    Down
                  </button>
                  <button type="button" class="btn-remove" (click)="removeInstruction(i)">x</button>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="form-section">
          <div class="form-field">
            <label for="categories">Categories (comma-separated)</label>
            <input
              id="categories"
              type="text"
              formControlName="categories"
              placeholder="e.g. dinner, vegetarian"
            />
          </div>
          <div class="form-field">
            <label for="tags">Tags (comma-separated)</label>
            <input id="tags" type="text" formControlName="tags" placeholder="e.g. quick, healthy" />
          </div>
        </div>

        @if (errorMessage) {
          <p class="error">{{ errorMessage }}</p>
        }

        <div class="form-actions">
          <button type="button" class="btn-cancel" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn-submit" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Saving...' : isEdit ? 'Update Recipe' : 'Create Recipe' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .form-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 24px;
      }
      h2 {
        margin: 0 0 24px;
      }
      .loading {
        text-align: center;
        color: #666;
      }
      .form-section {
        background: #fff;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        border: 1px solid #eee;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .section-header h3 {
        margin: 0;
      }
      .form-field {
        margin-bottom: 16px;
      }
      .form-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      label {
        display: block;
        margin-bottom: 4px;
        font-weight: 600;
        font-size: 0.9rem;
      }
      input,
      textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.95rem;
        font-family: inherit;
      }
      input:focus,
      textarea:focus {
        outline: none;
        border-color: #1c5b55;
      }
      .ingredient-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }
      .input-sm {
        max-width: 70px;
      }
      .input-md {
        max-width: 140px;
      }
      .input-lg {
        flex: 1;
      }
      .instruction-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      .step-number {
        font-weight: 700;
        padding-top: 10px;
        min-width: 24px;
      }
      .instruction-row textarea {
        flex: 1;
      }
      .instruction-actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .btn-add {
        background: #e8f5f3;
        color: #1c5b55;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-remove {
        background: #fdeaea;
        color: #c0392b;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 700;
      }
      .btn-move {
        background: #f0f0f0;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
      }
      .btn-move:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .error {
        color: #c0392b;
        font-size: 0.9rem;
      }
      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .btn-cancel {
        background: #f0f0f0;
        color: #333;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-submit {
        background: #1c5b55;
        color: #fff;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  loading = false;
  submitting = false;
  errorMessage = '';
  private recipeId = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly recipeService: RecipeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      description: [''],
      servings: [4, [Validators.required, Validators.min(1)]],
      prepTimeMinutes: [0, [Validators.min(0)]],
      cookTimeMinutes: [0, [Validators.min(0)]],
      ingredients: this.fb.array([]),
      instructions: this.fb.array([]),
      categories: [''],
      tags: ['']
    });

    this.recipeId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.recipeId;

    if (this.isEdit) {
      this.loading = true;
      this.recipeService.getRecipe(this.recipeId).subscribe({
        next: (recipe) => {
          this.form.patchValue({
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            prepTimeMinutes: recipe.prepTimeMinutes,
            cookTimeMinutes: recipe.cookTimeMinutes,
            categories: recipe.categories.join(', '),
            tags: recipe.tags.join(', ')
          });
          recipe.ingredients.forEach((ing) => {
            this.ingredientsArray.push(
              this.fb.group({
                amount: [ing.amount],
                unit: [ing.unit],
                name: [ing.name, Validators.required],
                group: [ing.group || '']
              })
            );
          });
          recipe.instructions.forEach((inst) => {
            this.instructionsArray.push(
              this.fb.group({
                text: [inst.text, Validators.required]
              })
            );
          });
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.message || 'Failed to load recipe';
          this.loading = false;
        }
      });
    } else {
      this.addIngredient();
      this.addInstruction();
    }
  }

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  get instructionsArray(): FormArray {
    return this.form.get('instructions') as FormArray;
  }

  addIngredient(): void {
    this.ingredientsArray.push(
      this.fb.group({
        amount: [1],
        unit: [''],
        name: ['', Validators.required],
        group: ['']
      })
    );
  }

  removeIngredient(index: number): void {
    this.ingredientsArray.removeAt(index);
  }

  addInstruction(): void {
    this.instructionsArray.push(
      this.fb.group({
        text: ['', Validators.required]
      })
    );
  }

  removeInstruction(index: number): void {
    this.instructionsArray.removeAt(index);
  }

  moveInstruction(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.instructionsArray.length) return;
    const control = this.instructionsArray.at(index);
    this.instructionsArray.removeAt(index);
    this.instructionsArray.insert(newIndex, control);
  }

  cancel(): void {
    if (this.isEdit) {
      this.router.navigate(['/recipes', this.recipeId]);
    } else {
      this.router.navigate(['/recipes']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.errorMessage = '';

    const formValue = this.form.value;
    const prepTime = formValue.prepTimeMinutes || 0;
    const cookTime = formValue.cookTimeMinutes || 0;

    const input: CreateRecipeInput = {
      title: formValue.title,
      description: formValue.description || '',
      servings: formValue.servings,
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      totalTimeMinutes: prepTime + cookTime,
      ingredients: formValue.ingredients.map(
        (ing: { amount: number; unit: string; name: string; group: string }) => ({
          amount: ing.amount,
          unit: ing.unit,
          name: ing.name,
          group: ing.group || null
        })
      ),
      instructions: formValue.instructions.map((inst: { text: string }, idx: number) => ({
        stepNumber: idx + 1,
        text: inst.text
      })),
      categories: this.splitCommaSeparated(formValue.categories),
      tags: this.splitCommaSeparated(formValue.tags),
      imageKeys: [],
      nutritionalInfo: null
    };

    const request$ = this.isEdit
      ? this.recipeService.updateRecipe(this.recipeId, input)
      : this.recipeService.createRecipe(input);

    request$.subscribe({
      next: (recipe) => {
        this.submitting = false;
        this.router.navigate(['/recipes', recipe.id]);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.message || 'Failed to save recipe';
      }
    });
  }

  private splitCommaSeparated(value: string): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
