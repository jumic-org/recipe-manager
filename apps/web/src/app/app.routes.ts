import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { ConfirmComponent } from './auth/confirm.component';
import { ChangePasswordComponent } from './auth/change-password.component';
import { RecipeListComponent } from './recipes/recipe-list.component';
import { RecipeDetailComponent } from './recipes/recipe-detail.component';
import { RecipeFormComponent } from './recipes/recipe-form.component';
import { RecipeImportComponent } from './recipes/recipe-import.component';
import { PantryComponent } from './pantry/pantry.component';
import { SupermarketListComponent } from './supermarkets/supermarket-list.component';
import { SupermarketFormComponent } from './supermarkets/supermarket-form.component';
import { SupermarketViewComponent } from './supermarkets/supermarket-view.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'recipes', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'confirm', component: ConfirmComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'recipes', component: RecipeListComponent, canActivate: [authGuard] },
  { path: 'recipes/new', component: RecipeFormComponent, canActivate: [authGuard] },
  { path: 'recipes/import', component: RecipeImportComponent, canActivate: [authGuard] },
  { path: 'recipes/:id', component: RecipeDetailComponent, canActivate: [authGuard] },
  { path: 'recipes/:id/edit', component: RecipeFormComponent, canActivate: [authGuard] },
  { path: 'recipes/:id/shop', component: SupermarketViewComponent, canActivate: [authGuard] },
  { path: 'pantry', component: PantryComponent, canActivate: [authGuard] },
  { path: 'supermarkets', component: SupermarketListComponent, canActivate: [authGuard] },
  { path: 'supermarkets/new', component: SupermarketFormComponent, canActivate: [authGuard] },
  { path: 'supermarkets/:id/edit', component: SupermarketFormComponent, canActivate: [authGuard] },
];
