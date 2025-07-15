"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface AvatarUploadProps {
  initialUrl?: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function AvatarUpload({ initialUrl, onUpload, onRemove }: AvatarUploadProps) {
  const [url, setUrl] = useState(initialUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generateUploadUrl = useAction(api.storage.generateUploadUrl);

  useEffect(() => {
    setUrl(initialUrl || "");
  }, [initialUrl]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerAspectCrop(width, height, 1);
    setCrop(crop);
    setCompletedCrop(crop);
  }, []);

  const optimizeImage = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Set max dimensions (512x512 for avatars)
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG for better compression (unless original is PNG with transparency)
        const outputType = selectedFile?.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = outputType === 'image/jpeg' ? 0.85 : 0.95;
        
        canvas.toBlob(
          (optimizedBlob) => {
            if (optimizedBlob) {
              resolve(optimizedBlob);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          outputType,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  };

  const getCroppedImg = async (): Promise<Blob> => {
    if (!imgRef.current || !completedCrop || !selectedFile) {
      throw new Error("Crop not completed");
    }

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas is empty"));
        },
        selectedFile.type,
        0.95
      );
    });
  };

  const handleCropComplete = async () => {
    try {
      setIsUploading(true);
      setIsCropping(false);
      
      const croppedBlob = await getCroppedImg();
      
      // Optimize the cropped image
      const optimizedBlob = await optimizeImage(croppedBlob);
      
      // Use optimized type (JPEG for photos, PNG for graphics)
      const outputType = selectedFile!.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const fileName = selectedFile!.name.replace(/\.[^.]+$/, outputType === 'image/jpeg' ? '.jpg' : '.png');
      
      const optimizedFile = new File([optimizedBlob], fileName, {
        type: outputType,
      });

      // Validate final file size after optimization
      if (optimizedFile.size > 5 * 1024 * 1024) {
        throw new Error("Image is still too large after optimization. Please select a smaller area.");
      }
      
      console.log(`Image optimized: ${(croppedBlob.size / 1024).toFixed(1)}KB → ${(optimizedFile.size / 1024).toFixed(1)}KB`);

      // Generate upload URL with retry
      let uploadData;
      let retries = 3;
      while (retries > 0) {
        try {
          uploadData = await generateUploadUrl({
            contentType: optimizedFile.type,
            fileName: optimizedFile.name,
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.warn(`Failed to generate upload URL, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!uploadData) {
        throw new Error("Failed to generate upload URL after multiple attempts");
      }

      const { uploadUrl, publicUrl } = uploadData;

      // Upload the file with retry logic
      retries = 3;
      let uploadSuccess = false;
      
      while (retries > 0 && !uploadSuccess) {
        try {
          const response = await fetch(uploadUrl, {
            method: "PUT",
            body: optimizedFile,
            headers: {
              "Content-Type": optimizedFile.type,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
          }
          
          uploadSuccess = true;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.warn(`Upload attempt failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Verify the image is accessible
      try {
        const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (!verifyResponse.ok) {
          console.warn('Avatar uploaded but not immediately accessible, this is normal for CDN propagation');
        }
      } catch (error) {
        console.warn('Could not verify avatar accessibility:', error);
      }

      // Update state and notify parent
      setUrl(publicUrl);
      onUpload(publicUrl);
      toast.success("Avatar uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('type')) {
          toast.error("Invalid file type. Please use JPEG, PNG, or WebP.");
        } else if (error.message.includes('size')) {
          toast.error(error.message);
        } else if (error.message.includes('network')) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error(error.message || "Failed to upload avatar");
        }
      } else {
        toast.error("Failed to upload avatar. Please try again.");
      }
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setPreviewUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setUrl("");
    onRemove?.();
    toast.success("Avatar removed");
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="h-32 w-32">
          <AvatarImage src={url} alt="Profile avatar" />
          <AvatarFallback className="bg-muted">
            <User className="h-12 w-12 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={onFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            size="sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Change Avatar
              </>
            )}
          </Button>
          
          {url && (
            <Button
              type="button"
              onClick={handleRemove}
              variant="outline"
              size="sm"
              className="ml-2"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isCropping} onOpenChange={setIsCropping}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          
          {previewUrl && (
            <div className="space-y-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={previewUrl}
                  onLoad={onImageLoad}
                  className="max-w-full"
                />
              </ReactCrop>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsCropping(false);
                    setPreviewUrl("");
                    setSelectedFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" variant="outline" onClick={handleCropComplete}>
                  Apply Crop
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}