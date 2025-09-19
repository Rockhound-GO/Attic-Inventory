export interface InventoryItem {
  id: number;
  name: string;
  type: string;
  value: number;
  history: string;
  photo: string; // base64 data URL
  createdAt: Date;
  status: 'To Sort' | 'To Photograph' | 'To Value' | 'Done';
}
