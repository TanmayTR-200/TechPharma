import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Settings, Loader2 } from 'lucide-react';
import { createUploadWidget } from '@/lib/cloudinary';
import { useAuth } from '@/contexts/auth';

export function EditProfileDialog() {
  const { toast } = useToast();
  const { refreshUserData } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    companyName: '',
    description: '',
    website: '',
    phone: '',
    address: '',
    logo: '',
  });

  // Load current user data when dialog opens
  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid server response format');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load profile');
      }

      setProfile({
        companyName: data.company?.name || '',
        description: data.company?.description || '',
        website: data.company?.website || '',
        phone: data.phone || '',
        address: data.company?.address || '',
        logo: data.company?.logo || '',
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profile data',
        variant: 'destructive',
      });
    }
  };

  const handleLogoUpload = () => {
    const widget = createUploadWidget(
      // Success callback
      (url) => {
        setProfile(prev => ({ ...prev, logo: url }));
        toast({
          title: 'Success',
          description: 'Logo uploaded successfully',
        });
      },
      // Error callback
      (error) => {
        toast({
          title: 'Upload Failed',
          description: error || 'Failed to upload logo. Please try again.',
          variant: 'destructive',
        });
      }
    );

    if (widget) {
      widget.open();
    } else {
      toast({
        title: 'Error',
        description: 'Upload widget failed to initialize',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      interface UpdateFields {
        company: {
          name?: string;
          description?: string;
          website?: string;
          address?: string;
          logo?: string;
        };
        phone?: string;
      }

      const updatedFields: UpdateFields = {
        company: {}
      };

      // Only add fields that have values
      if (profile.companyName) updatedFields.company.name = profile.companyName;
      if (profile.description) updatedFields.company.description = profile.description;
      if (profile.website) updatedFields.company.website = profile.website;
      if (profile.address) updatedFields.company.address = profile.address;
      if (profile.logo) updatedFields.company.logo = profile.logo;
      if (profile.phone) updatedFields.phone = profile.phone;

      // Don't submit if no fields were changed
      if (Object.keys(updatedFields.company).length === 0 && !updatedFields.phone) {
        toast({
          title: 'No Changes',
          description: 'No changes were made to your profile.',
        });
        setOpen(false);
        return;
      }

      console.log('Sending update:', updatedFields); // Debug log

      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields),
      });

      let responseData;
      try {
        const text = await response.text();
        responseData = JSON.parse(text);
        console.log('Update response:', responseData);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid server response format');
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to update profile');
      }

      // Update the profile state with the new data
      setProfile({
        companyName: responseData.company?.name || '',
        description: responseData.company?.description || '',
        website: responseData.company?.website || '',
        phone: responseData.phone || '',
        address: responseData.company?.address || '',
        logo: responseData.company?.logo || '',
      });

      // Update auth context by fetching fresh data
      await refreshUserData();

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      
      // Close the dialog after successful update
      setOpen(false);
    } catch (err) {
      const error = err as Error;
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadUserProfile();
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg">
          <Settings className="w-5 h-5" />
          Edit Profile Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your company information and profile details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={profile.companyName}
              onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
              placeholder="Your company name"
              className="text-white selection:bg-blue-500/50 selection:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Company Description (Optional)</Label>
            <Input
              id="description"
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="Brief description of your company"
              className="text-white selection:bg-blue-500/50 selection:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              type="url"
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              placeholder="https://your-website.com"
              className="text-white selection:bg-blue-500/50 selection:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+91 1234567890"
              className="text-white selection:bg-blue-500/50 selection:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Business Address (Optional)</Label>
            <Input
              id="address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="Your business address"
              className="text-white selection:bg-blue-500/50 selection:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo (Optional)</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogoUpload}
              className="w-full border border-white hover:bg-zinc-800"
            >
              {profile.logo ? 'Change Logo' : 'Upload Logo'}
            </Button>
            {profile.logo && (
              <div className="mt-2 flex items-center space-x-2">
                <div className="w-8 h-8 rounded overflow-hidden">
                  <img src={profile.logo} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm text-green-600">Logo uploaded successfully!</p>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full border border-white hover:bg-zinc-800"
            variant="ghost"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating Profile...
              </>
            ) : (
              'Update Profile'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
