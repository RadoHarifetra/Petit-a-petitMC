/// <reference types="vite/client" />
import React, { useEffect } from "react";
import { Upload } from "lucide-react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  multiple?: boolean;
  onMultipleChange?: (urls: string[]) => void;
}

declare global {
  interface Window {
    cloudinary: any;
  }
}

export default function CloudinaryUpload({ value, onChange, label = "Image", multiple = false, onMultipleChange }: Props) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const openWidget = () => {
    window.cloudinary.openUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        sources: ["local", "url", "camera"],
        multiple: multiple,
        maxFiles: multiple ? 20 : 1,
        resourceType: "image",
        language: "fr",
      },
      (error: any, result: any) => {
        if (!error && result.event === "success") {
          const url = result.info.secure_url;
          if (multiple && onMultipleChange) {
            onMultipleChange([url]);
          } else {
            onChange(url);
          }
        }
        if (!error && result.event === "queues-end" && multiple && onMultipleChange) {
          // handled per upload above
        }
      }
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-500 uppercase tracking-widest font-mono">{label}</label>
      <div className="flex flex-col gap-3">
        {value && !multiple && (
          <img src={value} alt="preview" className="w-24 h-24 object-cover rounded-xl border border-white/10" />
        )}
        <button
          type="button"
          onClick={openWidget}
          className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 hover:border-red-500 rounded-xl transition-all text-sm font-mono text-gray-400 hover:text-white w-fit"
        >
          <Upload className="w-4 h-4" />
          {value && !multiple ? "Changer l'image" : "Uploader une image"}
        </button>
        {value && !multiple && (
          <p className="text-[10px] text-gray-600 font-mono truncate max-w-xs">{value}</p>
        )}
      </div>
    </div>
  );
}