import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Share2 } from "lucide-react";
import type { FoodItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface FoodQRCodeProps {
  food: FoodItem;
  trigger?: React.ReactNode;
}

export function FoodQRCode({ food, trigger }: FoodQRCodeProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      generateQRCode();
    }
  }, [open, food]);

  const generateQRCode = async () => {
    try {
      // Create JSON data with food nutrition info
      const qrData = {
        type: 'fitfuel_food',
        version: '1.0',
        food: {
          name: food.name,
          brand: food.brand,
          kcal100g: food.kcal100g,
          protein100g: food.protein100g,
          fat100g: food.fat100g,
          carbs100g: food.carbs100g,
          fiber100g: food.fiber100g,
          sodium100g: food.sodium100g,
          gramsPerServing: food.gramsPerServing
        }
      };

      // Generate QR code as data URL
      const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast({
        title: 'QR码生成失败',
        description: '请稍后重试',
        variant: 'destructive'
      });
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `${food.name}-nutrition-qr.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: '下载成功',
      description: 'QR码已保存到本地'
    });
  };

  const handleShare = async () => {
    if (!qrDataUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${food.name}-nutrition-qr.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${food.name} 营养信息`,
          text: `扫描查看「${food.name}」的详细营养数据`,
          files: [file]
        });

        toast({
          title: '分享成功',
          description: 'QR码已分享'
        });
      } else {
        // Fallback to download if share API not available
        handleDownload();
      }
    } catch (error) {
      console.error('Failed to share QR code:', error);
      toast({
        title: '分享失败',
        description: '已自动保存到本地',
        variant: 'destructive'
      });
      handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-generate-qr">
            <QrCode className="w-4 h-4 mr-2" />
            生成QR码
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>食物营养QR码</DialogTitle>
          <DialogDescription>
            扫描此QR码即可快速录入「{food.name}」的营养信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="bg-white p-4 rounded-lg border flex justify-center">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt={`${food.name} QR Code`}
                className="w-full max-w-xs"
                data-testid="img-qr-code"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
                生成中...
              </div>
            )}
          </div>

          {/* Food Info */}
          <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
            <div className="font-medium">{food.name}</div>
            {food.brand && <div className="text-muted-foreground">{food.brand}</div>}
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>热量: {food.kcal100g} kcal/100g</div>
              <div>蛋白质: {food.protein100g}g/100g</div>
              <div>脂肪: {food.fat100g}g/100g</div>
              <div>碳水: {food.carbs100g}g/100g</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleDownload} 
              variant="outline" 
              className="flex-1"
              disabled={!qrDataUrl}
              data-testid="button-download-qr"
            >
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
            <Button 
              onClick={handleShare} 
              className="flex-1"
              disabled={!qrDataUrl}
              data-testid="button-share-qr"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
