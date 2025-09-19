import { Component, ChangeDetectionStrategy, computed, input, output, signal, inject } from '@angular/core';
import { InventoryItem } from '../../models/inventory-item.model';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-inventory-item',
  standalone: true,
  imports: [FormsModule, ConfirmationDialogComponent],
  templateUrl: './inventory-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryItemComponent {
  item = input.required<InventoryItem>();
  
  private inventoryService = inject(InventoryService);

  statuses: InventoryItem['status'][] = ['To Sort', 'To Photograph', 'To Value', 'Done'];
  showConfirmation = signal(false);

  isSelected = computed(() => this.inventoryService.selectedItemIds().has(this.item().id));

  statusColor = computed(() => {
    switch(this.item().status) {
      case 'To Sort': return 'bg-sky-100 text-sky-800 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20';
      case 'To Photograph': return 'bg-violet-100 text-violet-800 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20';
      case 'To Value': return 'bg-orange-100 text-orange-800 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20';
      case 'Done': return 'bg-green-100 text-green-800 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/20';
      default: return 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200';
    }
  });

  toggleSelection() {
    this.inventoryService.toggleItemSelected(this.item().id);
  }

  onRemoveClick(): void {
    this.showConfirmation.set(true);
  }
  
  handleConfirmDelete(): void {
    this.inventoryService.removeItem(this.item().id);
    this.showConfirmation.set(false);
  }

  handleCancelDelete(): void {
    this.showConfirmation.set(false);
  }

  onStatusChange(newStatus: InventoryItem['status']): void {
    this.inventoryService.updateItemStatus(this.item().id, newStatus);
  }
}