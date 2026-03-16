
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2 } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onDownload?: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
}) => {
  const handleShare = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'LifeGrid-Certificate.png', { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'My LifeGrid Certificate',
          text: 'I just sent a letter to my future self on LifeGrid!',
        });
      } else {
        // Fallback: trigger download
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'LifeGrid-Certificate.png';
        link.click();
      }
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && imageUrl && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/90 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 w-full max-w-lg flex flex-col items-center gap-6"
          >
            <div className="relative w-full aspect-[3/4] max-h-[70vh] rounded-lg overflow-hidden shadow-2xl border border-white/10">
              <img 
                src={imageUrl} 
                alt="Certificate Preview" 
                className="w-full h-full object-contain bg-stone-800"
              />
            </div>

            <div className="flex flex-col items-center gap-4 w-full">
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest">
                Long press the image to save to photos
              </p>
              
              <div className="flex gap-4 w-full max-w-xs">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Close
                </button>
                <button 
                  onClick={handleShare}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
