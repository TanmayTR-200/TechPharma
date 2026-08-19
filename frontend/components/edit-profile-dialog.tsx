import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Loader2 } from 'lucide-react';
import { createUploadWidget } from '@/lib/cloudinary';
import { useAuth } from '@/contexts/auth';

export function EditProfileDialog({ externalOpen, onExternalOpenChange }: { externalOpen?: boolean; onExternalOpenChange?: (open: boolean) => void }) {
  const { toast } = useToast();
  const { refreshUserData } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    setInternalOpen(val);
    if (onExternalOpenChange) onExternalOpenChange(val);
  };
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    companyName: '',
    description: '',
    website: '',
    phone: '',
    state: '',
    address: '',
    logo: '',
  });

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/profile', {
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
        state: data.state || '',
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
      (url) => {
        setProfile(prev => ({ ...prev, logo: url }));
        toast({
          title: 'Success',
          description: 'Logo uploaded successfully',
        });
      },
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

      const updatedFields: UpdateFields = { company: {} };

      if (profile.companyName) updatedFields.company.name = profile.companyName;
      if (profile.description) updatedFields.company.description = profile.description;
      if (profile.website) updatedFields.company.website = profile.website;
      if (profile.address) updatedFields.company.address = profile.address;
      if (profile.logo) updatedFields.company.logo = profile.logo;
      if (profile.phone) updatedFields.phone = profile.phone;
      if (profile.state !== undefined) updatedFields.state = profile.state;

      if (Object.keys(updatedFields.company).length === 0 && !updatedFields.phone && updatedFields.state === undefined) {
        toast({
          title: 'No Changes',
          description: 'No changes were made to your profile.',
        });
        setOpen(false);
        return;
      }

      const response = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/profile', {
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
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid server response format');
      }

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to update profile');
      }

      setProfile({
        companyName: responseData.company?.name || '',
        description: responseData.company?.description || '',
        website: responseData.company?.website || '',
        phone: responseData.phone || '',
        state: responseData.state || '',
        address: responseData.company?.address || '',
        logo: responseData.company?.logo || '',
      });

      await refreshUserData();

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

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
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-border">
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
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Company Description (Optional)</Label>
            <Input
              id="description"
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="Brief description of your company"
              className="rounded-lg"
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
              className="rounded-lg"
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
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              value={profile.state}
              onChange={(e) => setProfile({ ...profile, state: e.target.value })}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select your state</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
              <option value="Assam">Assam</option>
              <option value="Bihar">Bihar</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Goa">Goa</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Haryana">Haryana</option>
              <option value="Himachal Pradesh">Himachal Pradesh</option>
              <option value="Jharkhand">Jharkhand</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Kerala">Kerala</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Manipur">Manipur</option>
              <option value="Meghalaya">Meghalaya</option>
              <option value="Mizoram">Mizoram</option>
              <option value="Nagaland">Nagaland</option>
              <option value="Odisha">Odisha</option>
              <option value="Punjab">Punjab</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Sikkim">Sikkim</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Tripura">Tripura</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Uttarakhand">Uttarakhand</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Delhi">Delhi</option>
              <option value="Jammu and Kashmir">Jammu and Kashmir</option>
              <option value="Ladakh">Ladakh</option>
              <option value="Puducherry">Puducherry</option>
              <option value="Chandigarh">Chandigarh</option>
              <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
              <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
              <option value="Lakshadweep">Lakshadweep</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Business Address (Optional)</Label>
            <Input
              id="address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="Your business address"
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo (Optional)</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogoUpload}
              className="w-full border-border hover:bg-muted rounded-lg"
            >
              {profile.logo ? 'Change Logo' : 'Upload Logo'}
            </Button>
            {profile.logo && (
              <div className="mt-2 flex items-center space-x-2">
                <div className="w-8 h-8 rounded overflow-hidden">
                  <img src={profile.logo} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm text-primary">Logo uploaded successfully!</p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
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
