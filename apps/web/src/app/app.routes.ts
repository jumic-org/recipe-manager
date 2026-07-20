import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { ConfirmComponent } from './auth/confirm.component';
import { ChangePasswordComponent } from './auth/change-password.component';
import { RecipeListComponent } from './recipes/recipe-list.component';
import { RecipeDetailComponent } from './recipes/recipe-detail.component';
import { RecipeFormComponent } from './recipes/recipe-form.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'recipes', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'confirm', component: ConfirmComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'recipes', component: RecipeListComponent, canActivate: [authGuard] },
  { path: 'recipes/new', component: RecipeFormComponent, canActivate: [authGuard] },
  { path: 'recipes/:id', component: RecipeDetailComponent, canActivate: [authGuard] },
  { path: 'recipes/:id/edit', component: RecipeFormComponent, canActivate: [authGuard] }
];
