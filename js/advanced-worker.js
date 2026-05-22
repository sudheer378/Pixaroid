/**
 * Advanced Web Worker for Pixaroid Pro
 * Handles heavy image processing in background threads
 */

self.onmessage = async function(e) {
    const { type, file, settings, taskId } = e.data;

    if (type === 'process') {
        try {
            await processImage(file, settings, taskId);
        } catch (error) {
            self.postMessage({ type: 'error', taskId, error: error.message });
        }
    }
};

async function processImage(file, settings, taskId) {
    const arrayBuffer = await file.arrayBuffer();
    const bitmap = await createImageBitmap(new Blob([arrayBuffer]));
    
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    
    // Report initial progress
    self.postMessage({ type: 'progress', taskId, progress: 10 });

    let outputBlob;
    const format = settings.format || 'image/jpeg';
    const quality = settings.quality || 0.8;

    // Apply transformations based on tool type
    if (settings.operation === 'compress') {
        outputBlob = await compressImage(canvas, format, quality, settings.targetSize);
    } else if (settings.operation === 'resize') {
        outputBlob = await resizeImage(canvas, settings.width, settings.height, format, quality);
    } else if (settings.operation === 'convert') {
        outputBlob = await convertImage(canvas, format, quality);
    } else {
        outputBlob = await new Promise(resolve => canvas.convertToBlob({ type: format, quality }));
    }

    self.postMessage({ type: 'progress', taskId, progress: 90 });

    const blobUrl = URL.createObjectURL(outputBlob);
    self.postMessage({ type: 'complete', taskId, blobUrl, size: outputBlob.size });
    
    // Cleanup
    bitmap.close();
}

async function compressImage(canvas, format, initialQuality, targetSizeKB) {
    if (!targetSizeKB) {
        return await new Promise(resolve => canvas.convertToBlob({ type: format, quality: initialQuality }));
    }

    // Binary search for optimal quality to hit target size
    let minQ = 0.1;
    let maxQ = 0.95;
    let bestBlob = null;
    
    for (let i = 0; i < 5; i++) { // Max 5 iterations for performance
        const q = (minQ + maxQ) / 2;
        const blob = await new Promise(resolve => canvas.convertToBlob({ type: format, quality: q }));
        
        if (blob.size / 1024 <= targetSizeKB) {
            bestBlob = blob;
            minQ = q + 0.05; // Try higher quality
        } else {
            maxQ = q - 0.05; // Need lower quality
        }
    }
    
    return bestBlob || await new Promise(resolve => canvas.convertToBlob({ type: format, quality: 0.6 }));
}

async function resizeImage(canvas, width, height, format, quality) {
    const resized = new OffscreenCanvas(width, height);
    const ctx = resized.getContext('2d');
    
    // High-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, width, height);
    
    return await new Promise(resolve => resized.convertToBlob({ type: format, quality }));
}

async function convertImage(canvas, format, quality) {
    return await new Promise(resolve => canvas.convertToBlob({ type: format, quality }));
}
