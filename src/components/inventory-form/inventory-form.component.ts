import { Component, ChangeDetectionStrategy, output, viewChild, ElementRef, signal, inject, computed, effect } from '@angular/core';
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

  // New camera feature states
  cameraFacingMode = signal<'user' | 'environment'>('environment');
  canSwitchCamera = signal(false);
  canZoom = signal(false);
  zoomLevel = signal(1);
  zoomMin = signal(1);
  zoomMax = signal(10);
  zoomStep = signal(0.1);

  constructor() {
    effect(() => {
      const level = this.zoomLevel();
      if (this.stream && this.canZoom()) {
        const track = this.stream.getVideoTracks()[0];
        // @ts-ignore - applyConstraints is available on MediaStreamTrack
        track.applyConstraints({ advanced: [{ zoom: level }] }).catch(e => console.error('Error applying zoom', e));
      }
    });
  }

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
    this.stopCamera();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: this.cameraFacingMode(),
            } 
        });
        this.errorMessage.set('');
        const video = this.videoRef()?.nativeElement;
        if (video) {
          video.srcObject = this.stream;
          video.play();
          this.cameraState.set('streaming');
          await this.checkCameraCapabilities();
        }
      } else {
        throw new Error('Camera not supported on this device.');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      if (this.cameraFacingMode() === 'environment') {
        this.cameraFacingMode.set('user');
        console.log('Environment camera failed, trying user camera...');
        this.startCamera(); // Try again with front camera
        return;
      }
      this.errorMessage.set('Could not access the camera. Please check permissions.');
      this.cameraState.set('error');
    }
  }

  async checkCameraCapabilities() {
    // Check for multiple cameras
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      this.canSwitchCamera.set(videoDevices.length > 1);
    } catch (e) {
      console.error('Could not enumerate devices', e);
      this.canSwitchCamera.set(false);
    }


    // Check for zoom support
    if (this.stream) {
        const track = this.stream.getVideoTracks()[0];
        if (track && 'getCapabilities' in track) {
            const capabilities = track.getCapabilities();
            // @ts-ignore
            if (capabilities.zoom) {
                // @ts-ignore
                const zoomCaps = capabilities.zoom;
                if (zoomCaps.max > zoomCaps.min) {
                    this.canZoom.set(true);
                    this.zoomMin.set(zoomCaps.min);
                    this.zoomMax.set(zoomCaps.max);
                    this.zoomStep.set(zoomCaps.step);
                    // @ts-ignore
                    this.zoomLevel.set(track.getSettings().zoom || 1);
                } else {
                    this.canZoom.set(false);
                }
            } else {
                this.canZoom.set(false);
            }
        }
    }
  }

  switchCamera() {
    this.cameraFacingMode.update(mode => mode === 'environment' ? 'user' : 'environment');
    this.startCamera();
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
    this.canSwitchCamera.set(false);
    this.canZoom.set(false);
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
    this.stopCamera();
  }

  // --- Type Management ---
  startEditing(typeName: string) {
    this.editingTypeName.set(typeName);
    this.editingTypeValue.set(typeName);
  }

  cancelEditing() {
    this.editingTypeName.set(null);
    this.editingTypeValue.set('');
  }

  saveTypeEdit(oldName: string) {
    const newName = this.editingTypeValue().trim();
    if (newName && newName !== oldName) {
      this.inventoryService.updateType(oldName, newName);
    }
    this.cancelEditing();
  }

  deleteType(typeName: string) {
    this.inventoryService.deleteType(typeName);
  }
}
