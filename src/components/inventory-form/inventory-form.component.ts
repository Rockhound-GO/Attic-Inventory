import { Component, ChangeDetectionStrategy, output, viewChild, ElementRef, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { InventoryItem } from '../../models/inventory-item.model';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './inventory-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryFormComponent {
  private inventoryService = inject(InventoryService);
  types = this.inventoryService.types;
  statuses: InventoryItem['status'][] = ['To Sort', 'To Photograph', 'To Value', 'Done'];

  newItem = output<Omit<InventoryItem, 'id' | 'createdAt'>>();

  // Form fields
  itemName = signal('');
  selectedTypeValue = signal(this.types().length > 0 ? this.types()[0] : '');
  newType = signal('');
  itemHistory = signal('');
  itemValue = signal<number | null>(null);
  itemStatus = signal<InventoryItem['status']>('To Sort');
  itemPhoto = signal<string | null>(null);

  // Derived state for type
  showNewTypeInput = computed(() => this.selectedTypeValue() === '__new__');

  // State for type management modal
  isManagingTypes = signal(false);
  editingTypeName = signal<string | null>(null);
  editingTypeValue = signal('');

  // Camera state
  cameraState = signal<'idle' | 'streaming' | 'captured' | 'error'>('idle');
  errorMessage = signal('');
  
  videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  stream: MediaStream | null = null;

  isFormValid = computed(() => {
    const nameValid = !!this.itemName().trim();
    const photoValid = !!this.itemPhoto();
    let typeValid = false;
    if (this.showNewTypeInput()) {
      typeValid = !!this.newType().trim();
    } else {
      typeValid = !!this.selectedTypeValue();
    }
    return nameValid && photoValid && typeValid;
  });

  async startCamera() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = this.videoRef()?.nativeElement;
        if (video) {
          video.srcObject = this.stream;
          video.play();
          this.cameraState.set('streaming');
        }
      } else {
        throw new Error('Camera not supported on this device.');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      this.errorMessage.set('Could not access the camera. Please check permissions.');
      this.cameraState.set('error');
    }
  }

  capturePhoto() {
    const video = this.videoRef()?.nativeElement;
    const canvas = this.canvasRef()?.nativeElement;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        this.itemPhoto.set(dataUrl);
        this.cameraState.set('captured');
        this.stopCamera();
      }
    }
  }

  retakePhoto() {
    this.itemPhoto.set(null);
    this.startCamera();
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  handleSubmit() {
    if (!this.isFormValid()) return;

    let finalType = this.selectedTypeValue();
    if (this.showNewTypeInput()) {
      finalType = this.newType().trim();
      this.inventoryService.addType(finalType);
    }

    this.newItem.emit({
      name: this.itemName().trim(),
      type: finalType,
      history: this.itemHistory().trim(),
      photo: this.itemPhoto()!,
      value: this.itemValue() ?? 0,
      status: this.itemStatus(),
    });
    this.resetForm();
  }

  resetForm() {
    this.itemName.set('');
    this.selectedTypeValue.set(this.types().length > 0 ? this.types()[0] : '');
    this.newType.set('');
    this.itemHistory.set('');
    this.itemValue.set(null);
    this.itemStatus.set('To Sort');
    this.itemPhoto.set(null);
    this.cameraState.set('idle');
  }

  // --- Type Management Methods ---
  
  startEditing(type: string): void {
    this.editingTypeName.set(type);
    this.editingTypeValue.set(type);
  }

  cancelEditing(): void {
    this.editingTypeName.set(null);
    this.editingTypeValue.set('');
  }

  saveTypeEdit(oldName: string): void {
    const newName = this.editingTypeValue().trim();
    if (newName && oldName !== newName) {
      this.inventoryService.updateType(oldName, newName);
    }
    this.cancelEditing();
  }

  deleteType(name: string): void {
    if (confirm(`Are you sure you want to delete the "${name}" type? Items of this type will be moved to "Miscellaneous".`)) {
      this.inventoryService.deleteType(name);
    }
  }
}
