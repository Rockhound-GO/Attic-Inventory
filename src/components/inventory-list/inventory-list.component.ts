import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { InventoryItem } from '../../models/inventory-item.model';
import { InventoryItemComponent } from '../inventory-item/inventory-item.component';
import { InventoryService } from '../../services/inventory.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [InventoryItemComponent, ConfirmationDialogComponent],
  templateUrl: './inventory-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryListComponent {
  inventoryService = inject(InventoryService);
  showBulkDeleteConfirmation = signal(false);
  
  onSetSort(key: 'name' | 'createdAt' | 'value'): void {
    this.inventoryService.setSort(key);
  }

  handleBulkDelete(): void {
    this.inventoryService.bulkDelete();
    this.showBulkDeleteConfirmation.set(false);
  }

  onBulkStatusChange(event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    if (status) {
      this.inventoryService.bulkUpdateStatus(status as InventoryItem['status']);
    }
  }

  onBulkTypeChange(event: Event): void {
    const type = (event.target as HTMLSelectElement).value;
    if (type) {
      this.inventoryService.bulkUpdateType(type);
    }
  }
}