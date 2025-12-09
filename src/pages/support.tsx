import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle, Mail, Phone, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Support = () => {
  const { toast } = useToast();
  
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "",
    priority: "",
    message: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setTicketForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitTicket = () => {
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Here would be the actual ticket submission logic
    toast({
      title: "Ticket Submitted",
      description: "Your support ticket has been created. We'll get back to you soon!",
    });

    setTicketForm({
      subject: "",
      category: "",
      priority: "",
      message: ""
    });
  };

  // Mock support tickets
  const supportTickets = [
    {
      id: "TKT-001",
      subject: "Withdrawal not processed",
      category: "Withdrawals",
      status: "in-progress",
      priority: "high",
      createdAt: "2024-01-15 10:30",
      lastUpdate: "2024-01-15 14:20"
    },
    {
      id: "TKT-002",
      subject: "Question about referral commissions",
      category: "Referrals", 
      status: "resolved",
      priority: "low",
      createdAt: "2024-01-13 16:45",
      lastUpdate: "2024-01-14 09:15"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-success/10 text-success border-success"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "in-progress":
        return <Badge className="bg-info/10 text-info border-info"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case "open":
        return <Badge className="bg-warning/10 text-warning border-warning"><AlertCircle className="h-3 w-3 mr-1" />Open</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Support Center
          </h1>
          <p className="text-white/80">Get help with your account and platform questions</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="contact">Contact Us</TabsTrigger>
            <TabsTrigger value="ticket">Submit Ticket</TabsTrigger>
            <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Find quick answers to common questions</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="deposits">
                    <AccordionTrigger>How do I make a deposit?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>To make a deposit:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-4">
                          <li>Go to M-PESA on your phone</li>
                          <li>Select "Lipa na M-PESA" then "Pay Bill"</li>
                          <li>Enter Paybill Number: <strong>714888</strong></li>
                          <li>Enter Account Number: <strong>312139</strong></li>
                          <li>Enter your deposit amount</li>
                          <li>Enter your M-PESA PIN and send</li>
                          <li>Submit the confirmation code on our deposit page</li>
                        </ol>
                        <p className="text-muted-foreground">Your deposit will be reflected within 5 minutes after verification.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="withdrawals">
                    <AccordionTrigger>How do withdrawals work?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>Withdrawal process:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Minimum withdrawal amount: KES 100</li>
                          <li>You can only withdraw from your earnings wallet</li>
                          <li>Submit withdrawal request with your MPESA number</li>
                          <li>Withdrawals require admin approval</li>
                          <li>Processing time: 1-24 hours during business days</li>
                          <li>Funds are sent directly to your MPESA account</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="investments">
                    <AccordionTrigger>How do taxi investments work?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>Taxi investment details:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Each taxi plan has a fixed deposit amount and daily earning rate</li>
                          <li>Plans run for exactly 30 days from purchase</li>
                          <li>Earnings are credited hourly (daily earning ÷ 24)</li>
                          <li>After 30 days, the plan expires and no more earnings are credited</li>
                          <li>Your original deposit is locked during the 30-day period</li>
                          <li>Plans do not auto-renew - you decide when to reinvest</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="referrals">
                    <AccordionTrigger>How does the referral program work?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>Referral commission structure:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li><strong>Level A (10%):</strong> Direct referrals - people you refer directly</li>
                          <li><strong>Level B (5%):</strong> Second level - people referred by your direct referrals</li>
                          <li><strong>Level C (3%):</strong> Third level - people referred by Level B users</li>
                        </ul>
                        <p>Commissions are calculated on deposits made by users in your network and are credited to your earnings wallet after deposit completion.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="security">
                    <AccordionTrigger>Is my money safe?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>Security measures:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>All transactions are encrypted and secure</li>
                          <li>We use MPESA, Kenya's most trusted payment system</li>
                          <li>Your personal data is protected with industry-standard encryption</li>
                          <li>All deposits and withdrawals are tracked and auditable</li>
                          <li>Admin approval required for all withdrawals</li>
                        </ul>
                        <p className="text-muted-foreground">However, please remember that all investments carry risk. Only invest what you can afford to lose.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="technical">
                    <AccordionTrigger>I'm having technical issues. What should I do?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>Troubleshooting steps:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Try refreshing your browser or restarting the app</li>
                          <li>Clear your browser cache and cookies</li>
                          <li>Check your internet connection</li>
                          <li>Try using a different browser or device</li>
                          <li>If the problem persists, submit a support ticket with details</li>
                        </ul>
                        <p>For urgent issues affecting your funds, contact us immediately at victorjoakim139@gmail.com</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email Support
                  </CardTitle>
                  <CardDescription>Get detailed help via email</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">victorjoakim139@gmail.com</p>
                    <p className="text-sm text-muted-foreground">
                      We typically respond within 24 hours
                    </p>
                  </div>
                  <Button className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300">
                    Send Email
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-success" />
                    Live Support
                  </CardTitle>
                  <CardDescription>Submit a ticket for faster response</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">Submit a Support Ticket</p>
                    <p className="text-sm text-muted-foreground">
                      Track your inquiry and get priority support
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Create Ticket
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-soft bg-gradient-card">
              <CardHeader>
                <CardTitle>Support Hours</CardTitle>
                <CardDescription>When you can expect responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold">Email Support</h4>
                    <p className="text-sm text-muted-foreground">24 hours response time</p>
                  </div>
                  <div className="text-center">
                    <MessageCircle className="h-8 w-8 text-success mx-auto mb-2" />
                    <h4 className="font-semibold">Ticket Support</h4>
                    <p className="text-sm text-muted-foreground">4-8 hours response time</p>
                  </div>
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-warning mx-auto mb-2" />
                    <h4 className="font-semibold">Urgent Issues</h4>
                    <p className="text-sm text-muted-foreground">Immediate attention</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ticket" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Submit Support Ticket</CardTitle>
                <CardDescription>
                  Describe your issue and we'll help you resolve it quickly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={ticketForm.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={ticketForm.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposits">Deposits</SelectItem>
                        <SelectItem value="withdrawals">Withdrawals</SelectItem>
                        <SelectItem value="investments">Taxi Investments</SelectItem>
                        <SelectItem value="referrals">Referrals</SelectItem>
                        <SelectItem value="account">Account Issues</SelectItem>
                        <SelectItem value="technical">Technical Problems</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={ticketForm.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General inquiry</SelectItem>
                      <SelectItem value="medium">Medium - Issue affecting functionality</SelectItem>
                      <SelectItem value="high">High - Urgent, affecting funds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Detailed Description *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please provide as much detail as possible about your issue..."
                    rows={6}
                    value={ticketForm.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                  />
                </div>

                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <h4 className="font-semibold text-info mb-2">Before submitting:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Check the FAQ section for quick answers</li>
                    <li>• Include relevant transaction codes or IDs</li>
                    <li>• Describe steps you've already tried</li>
                    <li>• For deposit/withdrawal issues, include MPESA codes</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleSubmitTicket}
                  className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
                  size="lg"
                >
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>My Support Tickets</CardTitle>
                <CardDescription>Track the status of your support requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 rounded-lg bg-gradient-card border">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{ticket.subject}</span>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>#{ticket.id}</span>
                            <span>{ticket.category}</span>
                            <span>Created: {ticket.createdAt}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Last update: {ticket.lastUpdate}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {supportTickets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No support tickets yet</p>
                    <p className="text-sm">Submit a ticket if you need help</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Support;
