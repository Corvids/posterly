'use client';

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import { useImagePosterization } from '@/hooks/useImagePosterization';

export default function ImagePosterizer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [posterizationLevels, setPosterizationLevels] = useState(4);
  const [blackAndWhite, setBlackAndWhite] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processedSettings, setProcessedSettings] = useState<{levels: number, blackAndWhite: boolean, flipVertical: boolean} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processedImageUrl, isProcessing, posterizeImage, resetImage } = useImagePosterization();

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  useEffect(() => {
    saveToLocalStorage();
  }, [selectedFile, previewUrl, posterizationLevels, blackAndWhite, flipVertical, slideshowImages, processedSettings]);

  const loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem('posterizeToolData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        if (data.posterizationLevels) setPosterizationLevels(data.posterizationLevels);
        if (data.blackAndWhite !== undefined) setBlackAndWhite(data.blackAndWhite);
        if (data.flipVertical !== undefined) setFlipVertical(data.flipVertical);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };

  const saveToLocalStorage = () => {
    try {
      const dataToSave = {
        posterizationLevels,
        blackAndWhite,
        flipVertical
      };
      localStorage.setItem('posterizeToolData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPEG, etc.)');
      return;
    }

    setError(null);
    setSelectedFile(file);
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSlideshowImages([url]);
    setCurrentSlide(0);
    
    resetImage();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPEG, etc.)');
        return;
      }
      
      setError(null);
      setSelectedFile(file);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSlideshowImages([url]);
      setCurrentSlide(0);
      
      resetImage();
    }
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    try {
      await posterizeImage(selectedFile, {
        levels: posterizationLevels,
        blackAndWhite,
        flipVertical,
      });
      
      setProcessedSettings({
        levels: posterizationLevels,
        blackAndWhite,
        flipVertical
      });
    } catch (error) {
      setError('Failed to process image. Please try again.');
    }
  };

  useEffect(() => {
    if (processedImageUrl && previewUrl) {
      setSlideshowImages([processedImageUrl, previewUrl]);
      setCurrentSlide(0);
    }
  }, [processedImageUrl, previewUrl]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slideshowImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slideshowImages.length) % slideshowImages.length);
  };

  const handleDownload = () => {
    if (!processedImageUrl) return;
    
    const link = document.createElement('a');
    link.href = processedImageUrl;
    const bwSuffix = blackAndWhite ? '_B&W' : '';
    const reversedSuffix = flipVertical ? '_reversed' : '';
    link.download = `posterized_image_${posterizationLevels}${bwSuffix}${reversedSuffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSlideshowImages([]);
    setCurrentSlide(0);
    setIsFullscreen(false);
    setFlipVertical(false);
    setProcessedSettings(null);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    resetImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    localStorage.removeItem('posterizeToolData');
  };

  const handleZoom = (direction: number) => {
    setZoomLevel(prev => {
      const newLevel = Math.max(0.5, Math.min(5, prev + direction * 0.1));
      return Math.round(newLevel * 10) / 10;
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      const deltaX = (e.clientX - dragStart.x) * 0.5;
      const deltaY = (e.clientY - dragStart.y) * 0.5;
      
      setPanPosition(prev => {
        const maxPanX = (zoomLevel - 1) * 200;
        const maxPanY = (zoomLevel - 1) * 200;
        
        return {
          x: Math.max(-maxPanX, Math.min(maxPanX, prev.x + deltaX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, prev.y + deltaY))
        };
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e?: React.MouseEvent | MouseEvent) => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      handleZoom(e.deltaY > 0 ? -1 : 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isFullscreen) {
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoom(1);
          break;
        case '-':
          e.preventDefault();
          handleZoom(-1);
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'Escape':
          setIsFullscreen(false);
          break;
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Posterly</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {previewUrl ? 'Change Image' : 'Click to upload or drag and drop'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  PNG, JPEG up to 10MB
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Posterization Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Posterization Level: {posterizationLevels}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={posterizationLevels}
                      onChange={(e) => setPosterizationLevels(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>2</span>
                      <span>10</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="blackAndWhite"
                      checked={blackAndWhite}
                      onChange={(e) => setBlackAndWhite(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="blackAndWhite" className="ml-2 text-sm text-gray-700">
                      Convert to black and white
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="flipVertical"
                      checked={flipVertical}
                      onChange={(e) => setFlipVertical(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="flipVertical" className="ml-2 text-sm text-gray-700">
                      Flip image vertically
                    </label>
                  </div>

                  <button
                    onClick={handleProcessImage}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Posterize Image'}
                  </button>
                </div>
              </div>
            )}

            {processedImageUrl && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Download / Start Over</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleDownload}
                    disabled={!processedImageUrl}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    Download Posterized Image
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={!selectedFile}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}

            {!processedImageUrl && selectedFile && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Actions</h2>
                <div className="space-y-3">
                  <button
                    disabled
                    className="w-full bg-gray-400 cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Download Posterized Image
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}

            {!selectedFile && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Actions</h2>
                <div className="space-y-3">
                  <button
                    disabled
                    className="w-full bg-gray-400 cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Download Posterized Image
                  </button>
                  <button
                    disabled
                    className="w-full bg-gray-400 cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {slideshowImages.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Images</h2>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Expand to fullscreen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
                
                <div className="relative">
                  <div className="relative overflow-hidden rounded-lg">
                    <div 
                      className="flex transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                      {slideshowImages.map((image, index) => (
                        <div key={index} className="w-full flex-shrink-0 relative">
                          <img
                            src={image}
                            alt={slideshowImages.length === 1 ? 'Original' : (index === 0 ? 'Posterized' : 'Original')}
                            className="w-full h-auto rounded-lg shadow-md"
                          />
                          <div className="mt-2 text-center text-sm text-gray-600 font-medium">
                            {slideshowImages.length === 1 
                              ? selectedFile?.name 
                              : (index === 0 
                                  ? `${processedSettings?.levels || posterizationLevels} levels of posterization ${processedSettings?.blackAndWhite ? ' • B&W' : ''}${processedSettings?.flipVertical ? ' • Reversed' : ''}` 
                                  : selectedFile?.name
                                )
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {slideshowImages.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors z-10"
                      >
                        ←
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors z-10"
                      >
                        →
                      </button>
                    </>
                  )}
                </div>

                {slideshowImages.length > 1 && (
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-center space-x-2">
                      {slideshowImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToSlide(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isFullscreen && (
              <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
                <div className="relative w-full h-full flex items-center justify-center">
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
                    title="Close fullscreen"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <button
                    onClick={resetZoom}
                    className="absolute top-4 left-4 p-2 text-white hover:text-gray-300 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
                    title="Reset zoom"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  <div className="absolute top-4 left-20 flex space-x-2">
                    <button
                      onClick={() => handleZoom(-1)}
                      className="p-2 text-white hover:text-gray-300 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
                      title="Zoom out"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleZoom(1)}
                      className="p-2 text-white hover:text-gray-300 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors z-10"
                      title="Zoom in"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <div 
                      className="relative overflow-hidden rounded-lg w-full h-full"
                      onWheel={handleWheel}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <div 
                        className="flex transition-transform duration-500 ease-in-out h-full"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                        {slideshowImages.map((image, index) => (
                          <div key={index} className="w-full h-full flex-shrink-0 relative">
                            <img
                              src={image}
                              alt={slideshowImages.length === 1 ? 'Original' : (index === 0 ? 'Posterized' : 'Original')}
                              className="w-full h-full object-contain transition-transform duration-200"
                              style={{
                                transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                              }}
                              onMouseDown={handleMouseDown}
                            />
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-white text-lg font-medium bg-black bg-opacity-50 px-4 py-2 rounded">
                              {slideshowImages.length === 1 
                                ? selectedFile?.name 
                                : (index === 0 
                                    ? `${processedSettings?.levels || posterizationLevels} levels of posterization ${processedSettings?.blackAndWhite ? ' • B&W' : ''}${processedSettings?.flipVertical ? ' • Reversed' : ''}` 
                                    : selectedFile?.name
                                  )
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {slideshowImages.length > 1 && (
                      <>
                        <button
                          onClick={prevSlide}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-full hover:bg-opacity-70 transition-colors z-10"
                        >
                          ←
                        </button>
                        <button
                          onClick={nextSlide}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-4 rounded-full hover:bg-opacity-70 transition-colors z-10"
                        >
                          →
                        </button>
                      </>
                    )}
                  </div>

                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
                    Zoom: {Math.round(zoomLevel * 100)}%
                  </div>
                </div>
              </div>
            )}

            {slideshowImages.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Upload an image to see the preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
