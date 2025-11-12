import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<string>('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      stopScanning();
      return;
    }

    startScanning();

    return () => {
      stopScanning();
    };
  }, [open]);

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
              
              onScan(barcode);
              stopScanning();
              onClose();
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
      scanTimeoutRef.current = null;
    }
    lastScanRef.current = '';
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            扫描条码
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scan area overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-primary rounded-lg shadow-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            </div>

            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white text-sm">正在启动摄像头...</p>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            将条码对准扫描框，系统会自动识别
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleClose}
            data-testid="button-close-scanner"
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
