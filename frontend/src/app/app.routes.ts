import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { CallbackComponent } from './auth/callback.component';
import { ChangePasswordComponent } from './password/change-password.component';
import { RecipeListComponent } from './recipes/recipe-list.component';

export const routes: Routes = [
  { path: 'auth/callback', component: CallbackComponent },
  { path: '', component: RecipeListComponent, canActivate: [authGuard] },
  { path: 'password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
