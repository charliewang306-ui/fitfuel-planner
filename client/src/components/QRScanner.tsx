import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScanResult {
  type: string;
  version: string;
  food: {
    name: string;
    brand?: string;
    kcal100g: number;
    protein100g: number;
    fat100g: number;
    carbs100g: number;
    fiber100g: number;
    sodium100g?: number;
    gramsPerServing?: number;
  };
}

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (result: QRScanResult) => void;
}

export function QRScanner({ open, onClose, onScanSuccess }: QRScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [open]);

  const startScanning = async () => {
    try {
      setIsScanning(true);

      // Initialize QR code reader
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Get video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start continuous decoding
        const decodeLoop = async () => {
          if (!readerRef.current || !videoRef.current) return;
          
          try {
            const result = await reader.decodeFromVideoElement(videoRef.current);
            if (result) {
              handleScanResult(result.getText());
            } else {
              // Continue scanning if no result yet
              requestAnimationFrame(decodeLoop);
            }
          } catch (error) {
            // Continue scanning on error
            requestAnimationFrame(decodeLoop);
          }
        };
        
        decodeLoop();
      }
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      toast({
        title: '无法启动摄像头',
        description: '请检查摄像头权限',
        variant: 'destructive'
      });
      onClose();
    }
  };

  const stopScanning = () => {
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Reset reader
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }

    setIsScanning(false);
  };

  const handleScanResult = (text: string) => {
    try {
      const data = JSON.parse(text) as QRScanResult;

      // Validate QR code format
      if (data.type !== 'fitfuel_food') {
        throw new Error('Invalid QR code format');
      }

      // Validate required fields
      if (!data.food?.name || typeof data.food.kcal100g !== 'number') {
        throw new Error('Missing required nutrition data');
      }

      stopScanning();
      onScanSuccess(data);
      onClose();

      toast({
        title: '扫描成功',
        description: `已识别「${data.food.name}」`
      });
    } catch (error) {
      console.error('Failed to parse QR code:', error);
      toast({
        title: '无效的QR码',
        description: '此QR码不包含有效的营养信息',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>扫描营养QR码</DialogTitle>
          <DialogDescription>
            对准食物营养QR码进行扫描
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Video Feed */}
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            style={{ maxHeight: '400px' }}
            playsInline
            muted
            data-testid="video-qr-scanner"
          />

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-4 border-primary rounded-lg animate-pulse" />
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClose}
            data-testid="button-close-qr-scanner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          将QR码放置在框内，扫描将自动进行
        </p>
      </DialogContent>
    </Dialog>
  );
}
