import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Loader2, ScanBarcode } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { FoodItem } from "@shared/schema";

export default function ScanBarcodePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<string>('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-start scanning when component mounts
    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      const reader = readerRef.current;

      if (!videoRef.current) return;

      try {
        await reader.decodeFromVideoDevice(
          null, // Use default camera
          videoRef.current,
          (result, error) => {
            if (result) {
              const barcode = result.getText();
              
              // Debounce: prevent duplicate scans within 2 seconds
              if (barcode === lastScanRef.current) {
                return;
              }
              
              lastScanRef.current = barcode;
              
              // Clear any pending timeout
              if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
              }
              
              // Reset debounce after 2 seconds
              scanTimeoutRef.current = setTimeout(() => {
                lastScanRef.current = '';
              }, 2000);
              
              handleBarcodeScanned(barcode);
            }
            
            if (error && !(error instanceof NotFoundException)) {
              console.error('Barcode scan error:', error);
            }
          }
        );
      } catch (err: any) {
        console.error('Camera access error:', err);
        setError('无法访问摄像头，请确保已授予相机权限');
        setIsScanning(false);
      }
    } catch (err: any) {
      console.error('Scanner initialization error:', err);
      setError('扫描器初始化失败');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    setIsScanning(false);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setScannedBarcode(barcode);
    setIsProcessing(true);
    stopScanning();

    try {
      const res = await apiRequest('GET', `/api/barcode/${barcode}`, undefined);
      if (!res.ok) {
        throw new Error('Barcode not found');
      }
      const food: FoodItem = await res.json();
      
      // Navigate to LogFood page with the scanned food
      // Store in sessionStorage for the LogFood page to pick up
      sessionStorage.setItem('scannedFood', JSON.stringify(food));
      navigate('/log');
      
      toast({
        title: '扫码成功',
        description: `找到食物: ${food.name}`,
      });
    } catch (error) {
      toast({
        title: '未找到条码',
        description: '数据库中没有此商品信息，请手动添加或使用OCR识别',
        variant: 'destructive'
      });
      setIsProcessing(false);
      setScannedBarcode('');
      // Restart scanning
      setTimeout(() => startScanning(), 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/log')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">扫码识别</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        {/* Camera Preview */}
        <Card className="w-full max-w-md overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanBarcode className="w-5 h-5" />
              扫描条形码
            </CardTitle>
            <CardDescription>
              将条形码对准摄像头进行扫描
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-[4/3] bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              {isScanning && !isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-48 border-4 border-primary rounded-lg relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-1 bg-primary/50 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-white text-sm">处理中...</p>
                    {scannedBarcode && (
                      <p className="text-white/70 text-xs mt-1">{scannedBarcode}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error indicator */}
              {error && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                  <Card className="bg-destructive/90 border-destructive">
                    <CardContent className="p-4 text-center">
                      <Camera className="w-12 h-12 text-destructive-foreground mx-auto mb-2" />
                      <p className="text-destructive-foreground font-medium">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={startScanning}
                      >
                        重试
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="w-full max-w-md space-y-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-foreground">
                📱 <strong>使用提示:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                <li>• 保持条形码清晰可见</li>
                <li>• 确保光线充足</li>
                <li>• 手机与条码保持适当距离</li>
                <li>• 扫描成功后自动跳转</li>
              </ul>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/log')}
            data-testid="button-manual-entry"
          >
            手动输入食物
          </Button>
        </div>
      </main>
    </div>
  );
}
