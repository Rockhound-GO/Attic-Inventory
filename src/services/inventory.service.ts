import { Injectable, signal, computed } from '@angular/core';
import { InventoryItem } from '../models/inventory-item.model';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  items = signal<InventoryItem[]>([
    {
      id: 1,
      name: 'Old rocking chair',
      type: 'Furniture',
      value: 75,
      history: 'From grandma. A bit wobbly, might need repair.',
      photo: 'https://picsum.photos/id/10/400/300',
      createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
      status: 'To Value',
    },
    {
      id: 2,
      name: 'Box of Vinyl Records',
      type: 'Keepsakes',
      value: 200,
      history: 'Mostly classic rock from the 70s and 80s.',
      photo: 'https://picsum.photos/id/20/400/300',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      status: 'Done',
    }
  ]);
  types = signal<string[]>(['Antiques', 'Books', 'Clothing', 'Electronics', 'Furniture', 'Keepsakes', 'Tools', 'Miscellaneous']);
  
  // Selection state
  selectedItemIds = signal(new Set<number>());
  selectedItemCount = computed(() => this.selectedItemIds().size);
  areAllSelected = computed(() => this.items().length > 0 && this.selectedItemIds().size === this.items().length);

  // Sorting state
  sortKey = signal<'name' | 'createdAt' | 'value'>('createdAt');
  sortDirection = signal<'asc' | 'desc'>('desc');

  sortedItems = computed(() => {
    const items = [...this.items()];
    const key = this.sortKey();
    const direction = this.sortDirection();

    return items.sort((a, b) => {
      let valA, valB;

      switch(key) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'value':
          valA = a.value;
          valB = b.value;
          break;
        case 'createdAt':
          valA = a.createdAt.getTime();
          valB = b.createdAt.getTime();
          break;
      }
      
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  });

  addItem(item: Omit<InventoryItem, 'id' | 'createdAt'>) {
    this.items.update(items => [
      ...items,
      { 
        ...item, 
        id: Date.now(), 
        createdAt: new Date() 
      },
    ]);
  }

  removeItem(id: number) {
    this.items.update(items => items.filter(item => item.id !== id));
    this.selectedItemIds.update(ids => {
      ids.delete(id);
      return new Set(ids);
    });
  }
  
  updateItemStatus(id: number, status: InventoryItem['status']) {
    this.items.update(items =>
      items.map(item =>
        item.id === id ? { ...item, status: status } : item
      )
    );
  }

  addType(type: string) {
    if (type && !this.types().includes(type)) {
      this.types.update(types => [...types, type].sort());
    }
  }

  updateType(oldName: string, newName: string) {
    if (!newName || this.types().includes(newName)) return;
    this.types.update(types => types.map(c => (c === oldName ? newName : c)).sort());
    this.items.update(items => items.map(item => item.type === oldName ? { ...item, type: newName } : item));
  }

  deleteType(name: string) {
    if (name === 'Miscellaneous') return;
    this.types.update(types => types.filter(c => c !== name));
    this.items.update(items => items.map(item => item.type === name ? { ...item, type: 'Miscellaneous' } : item));
  }

  setSort(key: 'name' | 'createdAt' | 'value') {
    if (this.sortKey() === key) {
      this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set(key === 'createdAt' ? 'desc' : 'asc');
    }
  }

  // --- Selection & Bulk Action Methods ---
  toggleItemSelected(id: number) {
    this.selectedItemIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) newIds.delete(id);
      else newIds.add(id);
      return newIds;
    });
  }

  toggleSelectAll() {
    this.selectedItemIds.update(ids => {
      if (ids.size === this.items().length) {
        return new Set(); // Deselect all
      } else {
        return new Set(this.items().map(item => item.id)); // Select all
      }
    });
  }
  
  clearSelection() {
    this.selectedItemIds.set(new Set());
  }
  
  bulkDelete() {
    const selectedIds = this.selectedItemIds();
    this.items.update(items => items.filter(item => !selectedIds.has(item.id)));
    this.clearSelection();
  }
  
  bulkUpdateStatus(status: InventoryItem['status']) {
    const selectedIds = this.selectedItemIds();
    this.items.update(items => 
      items.map(item => 
        selectedIds.has(item.id) ? { ...item, status } : item
      )
    );
    this.clearSelection();
  }

  bulkUpdateType(type: string) {
    const selectedIds = this.selectedItemIds();
    this.items.update(items => 
      items.map(item => 
        selectedIds.has(item.id) ? { ...item, type } : item
      )
    );
    this.clearSelection();
  }
}