import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'rm-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  isAuthenticated$ = this.authService.isAuthenticated();

  constructor(private readonly authService: AuthService) {}

  signOut(): void {
    this.authService.signOut();
  }
}
