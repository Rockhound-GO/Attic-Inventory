import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { InventoryService } from './services/inventory.service';
import { InventoryFormComponent } from './components/inventory-form/inventory-form.component';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { InventoryItem } from './models/inventory-item.model';
import { ThemeService } from './services/theme.service';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [InventoryFormComponent, InventoryListComponent, ThemeToggleComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly inventoryService = inject(InventoryService);
  protected readonly themeService = inject(ThemeService); // Make it available for template

  handleNewItem(item: Omit<InventoryItem, 'id' | 'createdAt'>): void {
    this.inventoryService.addItem(item);
  }
}