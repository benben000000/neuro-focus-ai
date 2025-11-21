# Media Editor Feature Guide

## Overview

The Media Editor is a reusable image editing component that enables users to crop, zoom, rotate, and compress images before sharing stories or posts, or uploading attachments to the AI tutoring system.

## Features

### Crop Presets
The editor provides four crop ratio presets:
- **1:1 (Square)**: Instagram-style square format
- **4:5**: Portrait format (mobile stories)
- **16:9**: Landscape format
- **Freeform**: Manual crop positioning

### Zoom
- Range: 100% to 300%
- Controlled via slider or +/- buttons
- Maintains aspect ratio while zooming

### Rotation
- 90° increments (0°, 90°, 180°, 270°)
- Single button rotation for quick adjustments
- Smooth transition between rotation states

### Compression
- Automatic JPEG compression to optimize file size
- Ensures images stay under 1 MB for Firestore storage
- Dynamically adjusts compression quality (90% to 10%) based on final size

### Reset
- Restores all edits to original state
- Returns to default 1:1 crop ratio

## Component Architecture

### ImageEditor Component

**Location:** `components/ImageEditor.tsx`

**Props:**
```typescript
interface ImageEditorProps {
  imageDataUrl: string;  // Base64 data URL of image to edit
  onSave: (editedDataUrl: string) => void;  // Callback with edited image data URL
  onCancel: () => void;  // Callback when editing is cancelled
}
```

**Usage:**
```tsx
<ImageEditor
  imageDataUrl={rawImageDataUrl}
  onSave={(editedDataUrl) => handleSaveEditedImage(editedDataUrl)}
  onCancel={() => closeEditor()}
/>
```

### Integration Points

#### 1. CreateMediaModal (Stories & Posts)

When users create a story or post:
1. User clicks the upload area to select an image
2. ImageEditor modal opens automatically
3. User adjusts crop, zoom, rotation as needed
4. User clicks "Apply" to save edits
5. Edited image preview is displayed in the modal
6. User can click "Re-edit Photo" button to modify further
7. On share, the edited image is uploaded

**File:** `components/CreateMediaModal.tsx`

**Key changes:**
- Added state for managing raw and edited images
- Image selection now opens ImageEditor instead of directly processing
- Re-edit button allows multiple editing passes

#### 2. FileUploader (Attachments for Chat)

When users attach images to chat or AI assistance:
1. User selects an image file via upload or drag-drop
2. If an image is detected, ImageEditor opens automatically
3. User adjusts the image as needed
4. User clicks "Apply" to save
5. Edited image is converted to base64 FileAttachment
6. Compatible with existing Gemini API attachment pipeline

**File:** `components/FileUploader.tsx`

**Key changes:**
- Detects image files and triggers editor
- Converts edited image to base64 FileAttachment format
- Maintains support for non-image attachments (PDF, text, markdown)

## Data Flow

### CreateMediaModal Flow
```
User selects image
  ↓
ImageEditor opens with raw image
  ↓
User adjusts crop/zoom/rotation
  ↓
User clicks Apply
  ↓
Edited image (data URL) saved to state
  ↓
Preview shown in modal
  ↓
User can Re-edit or Share
  ↓
Edited image uploaded to Firestore
```

### FileUploader Flow
```
User selects/drags image file
  ↓
ImageEditor opens with file as data URL
  ↓
User adjusts crop/zoom/rotation
  ↓
User clicks Apply
  ↓
Edited image converted to base64 FileAttachment
  ↓
Attachment added to chat/tutoring context
  ↓
Compatible with Gemini API inlineData
```

## Technical Details

### Canvas-based Implementation
- Uses native HTML5 Canvas API (no external dependencies)
- Efficient image transformation and compression
- Works across modern browsers (Chrome, Firefox, Safari, Edge)

### Compression Algorithm
1. Initial compression quality: 90%
2. Generate JPEG data URL
3. If size > 1 MB, decrease quality by 10%
4. Repeat until under 1 MB or quality reaches 10%
5. Return optimized image data URL

### Image Transformations
- **Crop**: Extracts region from source image using canvas
- **Zoom**: Scales image within crop region
- **Rotate**: Applies CSS 3D transform on canvas context
- **All applied on canvas rendering** for smooth interaction

## Compatibility

### Browser Support
- Chrome/Chromium: ✓
- Firefox: ✓
- Safari: ✓
- Edge: ✓

### API Compatibility
- Firestore: Images stay under 1 MB
- Gemini API: base64 FileAttachment format
- Firebase Storage: Compatible with file size limits

## User Experience

### Mobile Responsiveness
- Full-screen modal on mobile devices
- Touch-friendly controls and buttons
- Responsive canvas sizing

### Dark Mode
- Full dark mode support via Tailwind
- Automatically adapts to system preference
- Consistent with app theme

### Accessibility
- Keyboard-friendly controls
- Clear button labels and icons
- Visible focus states

## Performance Considerations

### Optimization Tips
1. Large source images are automatically compressed on initial load
2. Canvas rendering is optimized for the crop region only
3. State updates are debounced for slider interactions
4. Image loading happens in useEffect to prevent re-renders

### Known Limitations
- Maximum image size handled: 20 MB (FileUploader limit)
- Maximum zoom: 3x
- Rotation limited to 90° increments
- Freeform crop requires manual canvas drag

## Future Enhancements

Potential improvements for future versions:
- Filter support (brightness, saturation, contrast)
- Aspect ratio presets from image metadata
- Undo/redo stack for multiple edits
- Batch image editing
- Pinch-to-zoom on touch devices
- Crop guides/grids
- Image filter effects

## Troubleshooting

### Image not showing in editor
- Verify image is valid image format (JPG, PNG, WebP)
- Check browser console for FileReader errors
- Ensure sufficient browser memory for large images

### Edited image too large
- Reduce zoom level
- Choose smaller crop region
- Application handles compression automatically

### Canvas rendering issues
- Clear browser cache
- Check GPU acceleration is enabled
- Verify browser supports HTML5 Canvas

## Testing Checklist

- [ ] Create story with image editing
- [ ] Create post with image editing
- [ ] Edit image multiple times (re-edit)
- [ ] Test all crop presets
- [ ] Test zoom slider and buttons
- [ ] Test rotation
- [ ] Test reset functionality
- [ ] Verify image compression under 1 MB
- [ ] Test in ChatTutor with FileUploader
- [ ] Test dark mode
- [ ] Test on mobile/tablet
- [ ] Verify edited image is used in upload
