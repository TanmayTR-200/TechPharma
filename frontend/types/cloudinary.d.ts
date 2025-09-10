interface CloudinaryUploadWidgetResult {
  event: string;
  info: {
    secure_url?: string;
    public_id?: string;
    error?: {
      message: string;
    };
  };
}

interface CloudinaryWidget {
  open(): void;
  close(): void;
  destroy(): void;
}

interface CloudinaryInterface {
  createUploadWidget: (
    options: {
      cloudName: string;
      uploadPreset: string;
      [key: string]: any;
    },
    callback: (error: Error | null, result: CloudinaryUploadWidgetResult) => void
  ) => CloudinaryWidget;
}

declare global {
  interface Window {
    cloudinary?: CloudinaryInterface;
  }
}

export type { CloudinaryUploadWidgetResult, CloudinaryWidget, CloudinaryInterface };
