export interface CloudinaryUploadWidgetResult {
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
  open: () => void;
  close: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: any,
        callback: (error: Error | null, result: CloudinaryUploadWidgetResult) => void
      ) => CloudinaryWidget;
    };
  }
}

export async function uploadToCloudinary(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'techpharma');
    formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dj92mesew');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dj92mesew'}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload to Cloudinary');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

export function createUploadWidget(
  onSuccess: (url: string) => void,
  onError: (error: string) => void
): CloudinaryWidget | null {
  if (typeof window === 'undefined') {
    console.error('Window is not defined');
    return null;
  }

  if (!window.cloudinary) {
    console.error('Cloudinary is not loaded');
    return null;
  }

  console.log('Creating upload widget with cloudinary...');
  
  return window.cloudinary.createUploadWidget(
    {
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dj92mesew',
      uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'techpharma',
      sources: ['local'],
      multiple: false,
      maxFiles: 1,
      maxFileSize: 5000000, // 5MB
      resourceType: 'image',
      clientAllowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
      showAdvancedOptions: false,
      cropping: true,
      croppingAspectRatio: 1,
      showSkipCropButton: true,
      showPoweredBy: false,
      showInsecurePreview: true,
      folder: 'techpharma_products',
      theme: 'minimal',
      styles: {
        palette: {
          window: '#FFFFFF',
          sourceBg: '#FFFFFF',
          windowBorder: '#90A0B3',
          tabIcon: '#0078FF',
          inactiveTabIcon: '#0E2F5A',
          menuIcons: '#5A616A',
          link: '#0078FF',
          action: '#0078FF',
          inProgress: '#0078FF',
          complete: '#20B832',
          error: '#F44235',
          textDark: '#000000',
          textLight: '#FFFFFF'
        }
      },
      text: {
        en: {
          local: {
            browse: 'Browse files',
            dd: {
              dragAndDrop: 'Drag and drop your image here'
            }
          }
        }
      }
    },
    (error, result) => {
      if (error) {
        console.error('Upload widget error:', error);
        onError(error.message || 'An error occurred during upload');
        return;
      }

      console.log('Upload widget event:', result?.event, result);

      if (!result) return;

      switch (result.event) {
        case 'success':
          if (result.info?.secure_url) {
            console.log('Upload successful:', result.info.secure_url);
            onSuccess(result.info.secure_url);
          } else {
            console.error('No secure URL in success response:', result);
            onError('Upload completed but no secure URL received');
          }
          break;

        case 'error':
          console.error('Upload error:', result.info);
          onError(result.info?.error?.message || 'Failed to upload image');
          break;

        case 'queues-end':
          // All uploads are completed
          console.log('All uploads completed');
          break;

        case 'close':
          // Widget is closed
          console.log('Upload widget closed');
          break;
      }
    }
  );
}
