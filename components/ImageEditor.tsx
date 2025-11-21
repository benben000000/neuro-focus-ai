import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';

interface ImageEditorProps {
  imageDataUrl: string;
  onSave: (editedDataUrl: string) => void;
  onCancel: () => void;
}

type CropPreset = 'square' | '4:5' | '16:9' | 'freeform';

interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageEditor({ imageDataUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, width: 100, height: 100 });
  const [cropPreset, setCropPreset] = useState<CropPreset>('square');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      const squareSize = Math.min(img.width, img.height);
      setCrop({
        x: (img.width - squareSize) / 2,
        y: (img.height - squareSize) / 2,
        width: squareSize,
        height: squareSize
      });
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Draw canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to crop dimensions
    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply zoom and draw the cropped portion
    const scaledX = crop.x - (crop.width * (zoom - 1)) / 2;
    const scaledY = crop.y - (crop.height * (zoom - 1)) / 2;
    const scaledWidth = crop.width * zoom;
    const scaledHeight = crop.height * zoom;

    ctx.drawImage(image, scaledX, scaledY, scaledWidth, scaledHeight, 0, 0, crop.width, crop.height);
    ctx.restore();
  }, [image, crop, zoom, rotation]);

  const handleCropPresetChange = (preset: CropPreset) => {
    setCropPreset(preset);
    if (!image) return;

    let newCrop = { ...crop };
    const containerWidth = 300;
    const containerHeight = 300;

    if (preset === 'square') {
      const size = Math.min(containerWidth, containerHeight);
      newCrop = { x: 0, y: 0, width: size, height: size };
    } else if (preset === '4:5') {
      const width = Math.min(containerWidth, containerHeight * (4 / 5));
      const height = (width * 5) / 4;
      newCrop = { x: 0, y: 0, width, height };
    } else if (preset === '16:9') {
      const width = containerWidth;
      const height = (width * 9) / 16;
      newCrop = { x: 0, y: 0, width, height };
    }
    setCrop(newCrop);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(1, Math.min(3, zoom + delta * 0.1));
    setZoom(newZoom);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setCropPreset('square');
    if (image) {
      const squareSize = Math.min(image.width, image.height);
      setCrop({
        x: (image.width - squareSize) / 2,
        y: (image.height - squareSize) / 2,
        width: squareSize,
        height: squareSize
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cropPreset === 'freeform') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !image) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCrop((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(prev.x + deltaX, image.width - prev.width)),
      y: Math.max(0, Math.min(prev.y + deltaY, image.height - prev.height))
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    // Compress the image
    let quality = 0.9;
    let compressedDataUrl = canvasRef.current.toDataURL('image/jpeg', quality);

    // Reduce quality if over 1MB
    while (compressedDataUrl.length > 1024 * 1024 && quality > 0.1) {
      quality -= 0.1;
      compressedDataUrl = canvasRef.current.toDataURL('image/jpeg', quality);
    }

    onSave(compressedDataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Edit Photo</h2>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview Canvas */}
        <div className="p-6 space-y-4">
          <div
            ref={containerRef}
            className="w-full flex justify-center bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-64 object-contain"
            />
          </div>

          {/* Crop Presets */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Crop Ratio
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['square', '4:5', '16:9', 'freeform'] as CropPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleCropPresetChange(preset)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    cropPreset === preset
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset === 'square' ? '1:1' : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom Controls */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Zoom: {Math.round(zoom * 100)}%
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleZoom(-0.5)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ZoomOut size={18} className="text-slate-600 dark:text-slate-400" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <button
                onClick={() => handleZoom(0.5)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ZoomIn size={18} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* Rotation Control */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Rotation: {rotation}°
            </label>
            <button
              onClick={handleRotate}
              className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCw size={18} />
              Rotate 90°
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
