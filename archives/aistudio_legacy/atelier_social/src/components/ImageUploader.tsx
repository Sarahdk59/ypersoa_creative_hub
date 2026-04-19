import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface ImageUploaderProps {
  onImageSelected: (file: File, base64: string) => void;
  selectedImage: string | null;
}

export function ImageUploader({ onImageSelected, selectedImage }: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          onImageSelected(file, reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  });

  if (selectedImage) {
    return (
      <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden group">
        <img
          src={selectedImage}
          alt="Selected product"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            {...getRootProps()}
            className="bg-white text-brand-text px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <input {...getInputProps()} />
            <ImageIcon className="w-4 h-4" />
            Changer d'image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "w-full aspect-[4/5] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors",
        isDragActive
          ? "border-brand-rose bg-brand-rose/5"
          : "border-brand-muted/30 hover:border-brand-rose/50 hover:bg-white/50"
      )}
    >
      <input {...getInputProps()} />
      <div className="w-16 h-16 rounded-full bg-brand-rose/10 flex items-center justify-center mb-4">
        <UploadCloud className="w-8 h-8 text-brand-rose" />
      </div>
      <h3 className="font-serif text-2xl font-medium mb-2">
        Glissez votre photo ici
      </h3>
      <p className="text-brand-muted text-sm max-w-[250px]">
        Formats acceptés : JPG, PNG, WEBP. Privilégiez des photos de bonne qualité.
      </p>
    </div>
  );
}
