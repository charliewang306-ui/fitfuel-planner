import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, Check, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface USDAFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: any[];
}

interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

interface USDASearchProps {
  open: boolean;
  onClose: () => void;
  onImport?: (foodItem: any) => void;
}

export function USDASearch({ open, onClose, onImport }: USDASearchProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<USDAFood | null>(null);

  // Search USDA database
  const { data: searchResults, isLoading } = useQuery<USDASearchResponse>({
    queryKey: debouncedQuery ? [`/api/usda/search?q=${debouncedQuery}`] : ['/api/usda/search'],
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (fdcId: number) => {
      const res = await apiRequest('POST', '/api/usda/import', { fdcId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/foods/search'] });
      
      toast({
        title: data.alreadyExists ? t('log:usda.alreadyExists') : t('log:usda.importSuccess'),
        description: data.alreadyExists 
          ? t('log:usda.alreadyExistsDesc')
          : t('log:usda.importSuccessDesc')
      });
      
      if (onImport) {
        onImport(data.foodItem);
      }
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: t('log:usda.importError'),
        description: error.message || t('log:usda.importErrorDesc'),
        variant: 'destructive'
      });
    }
  });

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) {
      setDebouncedQuery(searchQuery.trim());
    }
  };

  const handleImport = (food: USDAFood) => {
    setSelectedFood(food);
    importMutation.mutate(food.fdcId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-usda-title">
            <Database className="w-5 h-5" />
            {t('log:usda.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              placeholder={t('log:usda.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-usda-search"
            />
            <Button 
              onClick={handleSearch}
              disabled={isLoading || searchQuery.length < 2}
              data-testid="button-usda-search"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search Results */}
          <ScrollArea className="h-[400px] pr-4">
            {!debouncedQuery && (
              <div className="text-center text-muted-foreground py-12">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('log:usda.emptyState')}</p>
                <p className="text-sm mt-1">{t('log:usda.emptyStateTip')}</p>
              </div>
            )}

            {debouncedQuery && isLoading && (
              <div className="text-center text-muted-foreground py-12">
                <Loader2 className="w-12 h-12 mx-auto mb-3 opacity-50 animate-spin" />
                <p>{t('log:usda.searching')}</p>
              </div>
            )}

            {debouncedQuery && !isLoading && searchResults && (
              <div className="space-y-2">
                {searchResults.totalHits === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t('log:usda.noResults')}</p>
                    <p className="text-sm mt-1">{t('log:usda.tryDifferent')}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-2" data-testid="text-usda-result-count">
                      {t('log:usda.resultsFound', { count: searchResults.totalHits })}
                    </div>
                    {searchResults.foods.map((food) => (
                      <Card 
                        key={food.fdcId}
                        className="hover-elevate active-elevate-2 cursor-pointer"
                        data-testid={`card-usda-food-${food.fdcId}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm mb-1" data-testid={`text-food-name-${food.fdcId}`}>
                                {food.description}
                              </h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                {food.dataType && (
                                  <Badge variant="secondary" className="text-xs">
                                    {food.dataType}
                                  </Badge>
                                )}
                                {food.brandOwner && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    {food.brandOwner}
                                  </span>
                                )}
                                {food.servingSize && (
                                  <span className="text-xs text-muted-foreground">
                                    {food.servingSize} {food.servingSizeUnit}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleImport(food)}
                              disabled={importMutation.isPending && selectedFood?.fdcId === food.fdcId}
                              data-testid={`button-import-${food.fdcId}`}
                            >
                              {importMutation.isPending && selectedFood?.fdcId === food.fdcId ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  {t('log:usda.importing')}
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  {t('log:usda.import')}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
