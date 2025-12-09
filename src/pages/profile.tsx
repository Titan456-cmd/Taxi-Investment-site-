import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { User, Settings, Smartphone, Shield, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "John Doe",
    email: "john.doe@example.com",
    phone: "+254712345678",
    country: "Kenya",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully",
    });
  };

  const handleChangePassword = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully",
    });

    setFormData(prev => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }));
  };

  // Mock active devices
  const activeDevices = [
    {
      id: "1",
      device: "iPhone 14 Pro",
      location: "Nairobi, Kenya",
      lastActive: "Current session",
      isCurrent: true
    },
    {
      id: "2",
      device: "Chrome on Windows",
      location: "Nairobi, Kenya", 
      lastActive: "2 days ago",
      isCurrent: false
    }
  ];

  const revokeDevice = (deviceId: string) => {
    toast({
      title: "Device Revoked",
      description: "The selected device has been logged out",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <User className="h-8 w-8" />
            Profile Settings
          </h1>
          <p className="text-white/80">Manage your account and security settings</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  className="bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* KYC Status */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>Your account verification information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Verification</h4>
                      <p className="text-sm text-muted-foreground">Your email has been verified</p>
                    </div>
                    <Badge className="bg-success/10 text-success border-success">Verified</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Phone Verification</h4>
                      <p className="text-sm text-muted-foreground">Your phone number has been verified</p>
                    </div>
                    <Badge className="bg-success/10 text-success border-success">Verified</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Identity Verification</h4>
                      <p className="text-sm text-muted-foreground">Upload ID for higher limits</p>
                    </div>
                    <Badge className="bg-warning/10 text-warning border-warning">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.currentPassword}
                      onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleChangePassword}
                  className="bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
                >
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Withdrawal Password</CardTitle>
                <CardDescription>Set a separate password for withdrawals (recommended)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Withdrawal Password</h4>
                      <p className="text-sm text-muted-foreground">Extra security for fund withdrawals</p>
                    </div>
                    <Badge className="bg-warning/10 text-warning border-warning">Not Set</Badge>
                  </div>
                  <Button variant="outline">Set Withdrawal Password</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize your app appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="font-medium">Dark Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${theme === "light" ? "border-primary bg-primary/5" : "border-muted"}`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="text-center">
                      <div className="w-full h-12 bg-orange-500 rounded mb-2"></div>
                      <h4 className="font-medium">Light Mode</h4>
                      <p className="text-sm text-muted-foreground">Orange theme</p>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${theme === "dark" ? "border-primary bg-primary/5" : "border-muted"}`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="text-center">
                      <div className="w-full h-12 bg-blue-900 rounded mb-2"></div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-muted-foreground">Dark blue theme</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive updates via SMS</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Earnings Alerts</h4>
                    <p className="text-sm text-muted-foreground">Get notified when you earn</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Manage devices that are logged into your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-card">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{device.device}</span>
                            {device.isCurrent && (
                              <Badge className="bg-success/10 text-success border-success text-xs">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {device.location} • {device.lastActive}
                          </p>
                        </div>
                      </div>
                      {!device.isCurrent && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => revokeDevice(device.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Additional security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Login Alerts</h4>
                    <p className="text-sm text-muted-foreground">Get notified of new logins</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
