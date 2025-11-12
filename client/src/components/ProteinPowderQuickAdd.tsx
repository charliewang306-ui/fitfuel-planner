import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Droplets } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { Paywall } from "./Paywall";
import { useTranslation } from "react-i18next";

const SCOOP_SIZES = [
  { key: "scoop1", grams: 30 },
  { key: "scoop1_5", grams: 45 },
  { key: "scoop2", grams: 60 },
];

export function ProteinPowderQuickAdd() {
  const { t } = useTranslation(['log', 'common']);
  const { toast } = useToast();
  const { hasFeature } = useSubscription();
  const [selectedScoop, setSelectedScoop] = useState(30);

  // Get protein powder templates
  const { data: templates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/food-templates', { category: 'protein_powder' }]
  });

  // Log protein powder
  const logProtein = useMutation({
    mutationFn: async (foodId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const res = await apiRequest('POST', '/api/foodlogs', {
        foodItemId: foodId,
        grams: selectedScoop,
        oz: null,
        date: today
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('log:protein.addSuccess'),
        description: t('log:protein.addSuccessDesc', { grams: selectedScoop }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
    },
    onError: (error: any) => {
      toast({
        title: t('log:protein.addError'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Check feature access
  if (!hasFeature('protein_powder')) {
    return <Paywall feature="protein_powder" />;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const proteinPowder = templates?.[0];

  if (!proteinPowder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            {t('log:protein.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('log:protein.noTemplate')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-protein-powder">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          {t('log:protein.quickAdd')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('log:protein.scoopSize')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {SCOOP_SIZES.map((scoop) => (
              <Button
                key={scoop.grams}
                variant={selectedScoop === scoop.grams ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedScoop(scoop.grams)}
                data-testid={`button-scoop-${scoop.grams}`}
              >
                {t(`log:protein.${scoop.key}`)}
              </Button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => logProtein.mutate(proteinPowder.id)}
          disabled={logProtein.isPending}
          data-testid="button-log-protein"
        >
          {logProtein.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('log:protein.logging')}
            </>
          ) : (
            t('log:protein.logProtein', { grams: selectedScoop })
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {proteinPowder.protein100g}g protein per 100g
        </p>
      </CardContent>
    </Card>
  );
}
