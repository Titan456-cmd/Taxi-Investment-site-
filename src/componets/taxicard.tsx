import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Clock, DollarSign, TrendingUp } from "lucide-react";

interface TaxiCardProps {
  taxi: {
    id: string;
    name: string;
    image: string;
    deposit: number;
    dailyEarning: number;
    duration: number;
    available: boolean;
    comingSoon?: boolean;
  };
  onPurchase: () => void;
  userBalance: number;
  compact?: boolean;
  disabled?: boolean;
}

export const TaxiCard = ({ taxi, onPurchase, userBalance, compact = false, disabled = false }: TaxiCardProps) => {
  const canAfford = userBalance >= taxi.deposit;
  const totalEarnings = taxi.dailyEarning * taxi.duration;
  const roi = ((totalEarnings / taxi.deposit) * 100).toFixed(0);

  if (taxi.comingSoon) {
    return (
      <Card className={`border-0 shadow-soft bg-gradient-card opacity-75 ${compact ? 'h-auto' : 'h-full'}`}>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{taxi.name}</CardTitle>
          <Badge variant="secondary" className="mx-auto">Coming Soon</Badge>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground text-sm">
            This taxi plan will be available soon. Stay tuned for updates!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 shadow-soft bg-gradient-card hover:shadow-glow transition-all duration-300 ${compact ? 'h-auto' : 'h-full'}`}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <Car className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-lg">{taxi.name}</CardTitle>
        <CardDescription>Taxi {taxi.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Deposit</span>
            </div>
            <p className="text-lg font-bold text-primary">KES {taxi.deposit.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Daily</span>
            </div>
            <p className="text-lg font-bold text-success">KES {taxi.dailyEarning}</p>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-4 w-4 text-info" />
            <span className="text-sm font-medium">{taxi.duration} Days Duration</span>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            {roi}% ROI
          </Badge>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Total Earnings: <span className="font-bold text-success">KES {totalEarnings.toLocaleString()}</span></p>
        </div>

        <Button 
          className="w-full bg-gradient-primary shadow-soft hover:shadow-glow transition-all duration-300"
          onClick={onPurchase}
          disabled={!canAfford || !taxi.available || disabled}
        >
          {disabled ? "Processing..." : !canAfford ? "Insufficient Balance" : "Buy Now"}
        </Button>

        {!canAfford && (
          <p className="text-xs text-destructive text-center">
            Need KES {(taxi.deposit - userBalance).toLocaleString()} more
          </p>
        )}
      </CardContent>
    </Card>
  );
};
