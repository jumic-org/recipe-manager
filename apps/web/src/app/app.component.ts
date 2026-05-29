import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RecipeSummary {
  readonly name: string;
  readonly time: string;
  readonly tags: readonly string[];
}

@Component({
  selector: 'rm-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly recipes: readonly RecipeSummary[] = [
    {
      name: 'Lemon herb pasta',
      time: '25 min',
      tags: ['weeknight', 'vegetarian']
    },
    {
      name: 'Miso roasted vegetables',
      time: '40 min',
      tags: ['meal prep', 'vegan']
    },
    {
      name: 'Cardamom oat pancakes',
      time: '20 min',
      tags: ['breakfast', 'freezer friendly']
    }
  ];
}
