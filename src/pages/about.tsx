import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Shield, TrendingUp, Users, Mail, Phone, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-primary text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center space-y-6">
            <h1 className="text-5xl font-bold mb-4">About Taxi Investment Platform</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Making micro-investing in mobility assets accessible and transparent for everyone in Kenya and beyond
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Fixed Returns
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm">
                <Shield className="h-4 w-4 mr-2" />
                Transparent
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-sm">
                <Users className="h-4 w-4 mr-2" />
                Community Driven
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-12">
        {/* Who We Are */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Who We Are</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We are pioneers in democratizing investment opportunities in Kenya's growing mobility sector
            </p>
          </div>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold">Our Mission</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our mission is to make micro-investing in mobility assets accessible and transparent for everyone in Kenya and beyond. We believe that everyone deserves the opportunity to build wealth through smart, fixed-return investments in the transportation sector.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    By providing a platform where users can invest in virtual taxi assets with guaranteed daily returns, we're creating new pathways to financial freedom while supporting Kenya's digital economy.
                  </p>
                </div>
                <div className="bg-gradient-card p-6 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Accessible to all income levels</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Transparent investment terms</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Supporting digital financial inclusion</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Building community wealth</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How It Works */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Simple, transparent, and designed for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Deposit Funds</h3>
                <p className="text-sm text-muted-foreground">
                  Use MPESA Paybill to deposit money into your wallet securely and instantly
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-info">2</span>
                </div>
                <h3 className="font-semibold mb-2">Choose Your Taxi</h3>
                <p className="text-sm text-muted-foreground">
                  Select from our range of taxi investment plans with different deposit amounts and returns
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-success">3</span>
                </div>
                <h3 className="font-semibold mb-2">Earn Hourly</h3>
                <p className="text-sm text-muted-foreground">
                  Receive fixed earnings credited to your wallet every hour for 30 days
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-warning">4</span>
                </div>
                <h3 className="font-semibold mb-2">Withdraw Anytime</h3>
                <p className="text-sm text-muted-foreground">
                  Withdraw your earnings to MPESA once you reach the minimum threshold
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-soft bg-gradient-card">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <h4 className="font-semibold text-lg">Fixed Terms & Non-Compounding Plans</h4>
                <p className="text-muted-foreground">
                  All investment plans run for exactly <strong>30 days</strong> with fixed daily returns. 
                  Plans do not auto-renew or compound - you have full control over reinvestment decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Trust & Safety */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Trust & Safety</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Your security and trust are our top priorities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Data Protection</h4>
                    <p className="text-sm text-muted-foreground">All personal and financial data is encrypted and stored securely</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Compliance Standards</h4>
                    <p className="text-sm text-muted-foreground">Operating within Kenyan financial regulations and guidelines</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <h4 className="font-medium">Transparent Operations</h4>
                    <p className="text-sm text-muted-foreground">Clear terms, conditions, and risk disclosures</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Risk Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <h4 className="font-semibold text-warning mb-2">Important Investment Notice</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Virtual taxi investments carry inherent risks</li>
                    <li>• Returns are based on fixed terms, not market performance</li>
                    <li>• Past performance does not guarantee future results</li>
                    <li>• Only invest what you can afford to lose</li>
                    <li>• Withdrawal processing depends on platform liquidity</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Responsible Investing:</strong> We encourage all users to invest responsibly and within their means. 
                  Consider your financial situation before making investment decisions.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Why Choose Us</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Leading the way in accessible micro-investing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Transparent Rates</h3>
                <p className="text-sm text-muted-foreground">
                  Clear, fixed returns with no hidden fees or complex calculations
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <Phone className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Fast MPESA Deposits</h3>
                <p className="text-sm text-muted-foreground">
                  Quick and secure deposits using Kenya's trusted MPESA system
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <Car className="h-12 w-12 text-info mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Hourly Crediting</h3>
                <p className="text-sm text-muted-foreground">
                  Automated hourly earnings ensure consistent returns throughout your investment period
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft text-center">
              <CardContent className="p-6">
                <Users className="h-12 w-12 text-warning mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Multi-Level Referrals</h3>
                <p className="text-sm text-muted-foreground">
                  Earn commissions from your referral network with our 3-level system
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact & FAQ */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Contact & Support</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We're here to help you succeed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Get In Touch</CardTitle>
                <CardDescription>Have questions? We're here to help</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Email Support</h4>
                    <p className="text-sm text-muted-foreground">victorjoakim139@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Based in Kenya</h4>
                    <p className="text-sm text-muted-foreground">Serving customers across East Africa</p>
                  </div>
                </div>
                <Button className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300">
                  Contact Support
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Quick answers to common questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">How do deposits work?</h4>
                    <p className="text-xs text-muted-foreground">Use MPESA Paybill 714888 with account 312139. Funds reflect within 5 minutes.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">When do I receive earnings?</h4>
                    <p className="text-xs text-muted-foreground">Earnings are credited hourly for 30 days, then the plan expires.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">How do withdrawals work?</h4>
                    <p className="text-xs text-muted-foreground">Minimum KES 100, processed within 24 hours to your MPESA.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">How do referrals work?</h4>
                    <p className="text-xs text-muted-foreground">Earn 10%/5%/3% commission on deposits from your 3-level referral network.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
