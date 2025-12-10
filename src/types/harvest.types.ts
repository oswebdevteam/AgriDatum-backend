export interface HarvestRecord {
    id: number;
    farmer_id: string;
    phone_number: string;
    plot_location: string;
    crop_type: string;
    weight_kg: number;
    timestamp: Date;
    created_at: Date;
  }
  
  export interface HarvestSubmission {
    farmer_id: string;
    phone_number: string;
    plot_location: string;
    crop_type: string;
    weight_kg: string | number;
  }
  
  export interface VerificationRequest {
    record_id: number;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }