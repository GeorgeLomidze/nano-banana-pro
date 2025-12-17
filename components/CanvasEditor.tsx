import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CanvasEditorProps {
  image: string;
  brushSize: number;
  onMaskChange: (maskBase64: string | null) => void;
  className?: string;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ image, brushSize, onMaskChange, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawings, setHasDrawings] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      // Set internal dimensions to match source
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
  }, [image]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onMaskChange(canvas.toDataURL());
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(245, 184, 0, 0.4)'; // Branded color for visual feedback
    ctx.globalCompositeOperation = 'destination-out'; // "Erase" to make it transparent/masked
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawings(true);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.src = image;
    img.onload = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasDrawings(false);
      onMaskChange(null);
    };
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col items-center group w-full h-full max-h-[60vh] md:max-h-[65vh] ${className}`}>
      <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-all transform -translate-y-2 group-hover:translate-y-0">
        <button 
          onClick={clearMask}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 border border-red-400/20"
        >
          <i className="fas fa-rotate-left"></i> Reset
        </button>
      </div>
      <div className="p-2 glass-card rounded-[32px] shadow-2xl bg-base-dark/40 overflow-hidden flex items-center justify-center max-w-full max-h-full">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="max-w-full max-h-full rounded-[24px] cursor-crosshair bg-base-dark object-contain"
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="mt-4 flex items-center gap-4 bg-base-charcoal/60 px-5 py-2.5 rounded-full border border-white/5 backdrop-blur-md">
        <div className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse"></div>
        <p className="text-[10px] font-bold text-base-mist uppercase tracking-widest">
          {hasDrawings ? 'Mask Ready' : 'Draw to define edit zones'}
        </p>
      </div>
    </div>
  );
};

export default CanvasEditor;