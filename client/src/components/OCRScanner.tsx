import { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OCRScannerProps {
  open: boolean;
  onClose: () => void;
  onResult: (result: OCRNutritionResult) => void;
}

export interface OCRNutritionResult {
  name: string;
  brand?: string;
  servingSizeG?: number;
  kcal100g: number;
  protein100g: number;
  fat100g: number;
  carbs100g: number;
  fiber100g?: number;
  sodium100g?: number;
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
}

export function OCRScanner({ open, onClose, onResult }: OCRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedImage(null);
      setError('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError('');
      
      // Ensure any previous stream is stopped before starting a new one
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      setIsCapturing(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Prefer rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('无法访问摄像头，请确保已授予相机权限');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageData);

    // Stop camera after capture
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const processImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setError('');

    try {
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = capturedImage.split(',')[1];

      const response = await fetch('/api/ocr/nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR processing failed');
      }

      const result: OCRNutritionResult = await response.json();

      // Return result to parent
      onResult(result);
      onClose();
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setError(err.message || '处理图片失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-ocr-scanner">
        <DialogHeader>
          <DialogTitle>扫描营养标签</DialogTitle>
          <DialogDescription>
            对准营养成分表拍照，AI 将自动识别营养信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive" data-testid="alert-ocr-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  data-testid="video-camera-feed"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured nutrition label"
                className="w-full h-full object-contain"
                data-testid="img-captured-photo"
              />
            )}

            {!isCapturing && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Camera className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!capturedImage ? (
              <>
                <Button
                  onClick={capturePhoto}
                  disabled={!isCapturing}
                  className="flex-1"
                  data-testid="button-capture-photo"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  拍照
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-scan"
                >
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="flex-1"
                  data-testid="button-process-photo"
                >
                  {isProcessing ? (
                    <>处理中...</>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      确认识别
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={retake}
                  disabled={isProcessing}
                  data-testid="button-retake-photo"
                >
                  重拍
                </Button>
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            提示：确保营养成分表清晰完整，光线充足
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
