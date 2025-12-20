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

let activeWidget: CloudinaryWidget | null = null;
let widgetIsOpen = false;

export function createUploadWidget(
  onSuccess: (url: string) => void,
  onError: (error: string) => void
): CloudinaryWidget | null {
  if (typeof window === 'undefined' || !window.cloudinary) {
    console.error('Cloudinary is not available');
    return null;
  }

  // Prevent multiple widgets: if already open, do nothing
  if (widgetIsOpen) {
    console.log('Widget is already open, not opening again.');
    return activeWidget;
  }

  try {
    console.log('Creating upload widget with cloudinary...');
  activeWidget = window.cloudinary.createUploadWidget(
      {
        // Basic Configuration
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dj92mesew',
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'techpharma',
        folder: 'techpharma_products',

      // Upload Settings
      sources: ['local'],
      multiple: true,
      maxFiles: 5,
      maxFileSize: 5000000, // 5MB
      resourceType: 'image',
      clientAllowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
      useSecureTransport: true,

      // Widget Behavior
      showAdvancedOptions: false,
      showUploadMoreButton: false,
      showPoweredBy: false,
      showInsecurePreview: true,
      autoClose: false,
      singleUploadAutoClose: false,
      returnJustUrl: true,
      closeOnBackdropClick: true,
      queueComplete: false,

      // UI Configuration
      theme: 'minimal',
      insertInline: false,
      frameStyles: {
        zIndex: 2147483647,
        pointerEvents: 'auto'
      },

      // Text and Language
      language: "en",
      text: {
        en: {
          local: {
            browse: 'Browse files',
            dd: {
              dragAndDrop: 'Drag and drop your image here',
              browse: 'Browse'
            }
          },
          menu: {
            files: 'My Files'
          }
        }
      },

      // Styling
      styles: {
        palette: {
          window: '#ffffff',
          windowBorder: '#90A0B3',
          tabIcon: '#0078FF',
          menuIcons: '#5A616A',
          textDark: '#000000',
          textLight: '#ffffff',
          link: '#0078FF',
          action: '#0078FF',
          inactiveTabIcon: '#0E2F5A',
          error: '#F44235',
          inProgress: '#0078FF',
          complete: '#20B832',
          sourceBg: '#ffffff'
        },
        fonts: {
          default: null,
          "'Poppins', sans-serif": {
            url: 'https://fonts.googleapis.com/css?family=Poppins',
            active: true
          }
        }
      },
      // Make sure the entire upload area is clickable
      buttonStyles: {
        browse: {
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          padding: '10px 20px'
        }
      }
    },
    (error, result) => {
      if (error) {
        console.error('Upload widget error:', error);
        onError(error.message || 'An error occurred during upload');
        return;
      }

      if (!result) return;

      console.log('Upload widget event:', result.event, result);

      switch (result.event) {
        case 'display-changed': {
          const data = (result as any).data;
          if (data && data.status === 'shown') {
            widgetIsOpen = true;
          }
          break;
        }
        case 'success':
          if (result.info?.secure_url) {
            console.log('Upload successful:', result.info.secure_url);
            onSuccess(result.info.secure_url);
            // Let's NOT auto-close the widget - let user click "Done" manually
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
          // All uploads in the current batch are completed
          console.log('All uploads in current batch completed');
          break;

        case 'close':
          // Widget is closed
          console.log('Upload widget closed by user');
          widgetIsOpen = false;
          break;
      }
    }
    );

    return activeWidget;
  } catch (error) {
    console.error('Error creating upload widget:', error);
    onError('Failed to initialize upload widget');
    return null;
  }
}
