// PDF Layer Detection Utility
// Specifically looks for CutContour1 layers with green stroke color

interface LayerInfo {
  hasCutContour: boolean;
  layerNames: string[];
  cutContourColor?: string;
  totalLayers: number;
  cutContourDimensions?: {
    widthInches: number;
    heightInches: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export async function detectCutContourLayers(file: File): Promise<LayerInfo> {
  console.log(`🔬 Starting PDF layer detection for: ${file.name} (${file.size} bytes)`);
  
  try {
    // Dynamically import PDF.js to avoid SSR issues
    let pdfjsLib;
    try {
      pdfjsLib = await import('pdfjs-dist');
    } catch (importError) {
      console.error('Failed to import pdfjs-dist:', importError);
      throw new Error('PDF.js library could not be loaded. This might be a browser compatibility issue.');
    }

    // Skip analysis for non-PDF files
    if (!(file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      console.log('📄 Skipping PDF analysis for non-PDF file:', file.name);
      return {
        hasCutContour: false,
        layerNames: [],
        totalLayers: 0
      };
    }
    
    // Set worker source with fallback - updated to match installed version
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.js`;
    } catch (workerError) {
      console.warn('Could not set PDF.js worker source:', workerError);
      try {
        // Try alternative worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`;
      } catch (fallbackError) {
        console.warn('Could not set fallback PDF.js worker source:', fallbackError);
        // Try using a local/bundled worker if available
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
        } catch (localError) {
          console.warn('No local PDF worker available, PDF analysis may be limited');
        }
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const layerInfo: LayerInfo = {
      hasCutContour: false,
      layerNames: [],
      totalLayers: 0
    };

    // Check for Optional Content Groups (OCGs) - these are PDF layers
    const optionalContentConfig = await pdf.getOptionalContentConfig();
    
    if (optionalContentConfig) {
      // Get all groups from the optional content config
      const groups = (optionalContentConfig as any).getGroups?.() || [];
      layerInfo.totalLayers = groups.length;
      
      console.log(`📋 Found ${groups.length} layer groups in PDF`);
      
      for (const group of groups) {
        const groupName = group.name || '';
        layerInfo.layerNames.push(groupName);
        console.log(`🏷️ Layer found: "${groupName}"`);
        
        // Check if this layer contains CutContour (more flexible matching)
        const normalizedName = groupName.toLowerCase().trim();
        if (normalizedName.includes('cutcontour') || 
            normalizedName.includes('cut contour') ||
            normalizedName.includes('cut-contour') ||
            normalizedName === 'cutcontour' ||
            normalizedName.startsWith('cutcontour')) {
          layerInfo.hasCutContour = true;
          console.log(`✅ CutContour layer detected: "${groupName}"`);
          
          // Try to get dimensions from the cut contour layer
          try {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const operatorList = await page.getOperatorList();
            
            // Analyze the operator list for path operations that might be cut contours
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let foundCutContourPaths = false;
            
            for (let i = 0; i < operatorList.fnArray.length; i++) {
              const fn = operatorList.fnArray[i];
              const args = operatorList.argsArray[i];
              
              // Look for path operations (moveTo, lineTo, curveTo, etc.)
              if (fn === pdfjsLib.OPS.moveTo || fn === pdfjsLib.OPS.lineTo) {
                if (args && args.length >= 2) {
                  const x = args[0];
                  const y = args[1];
                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x);
                  maxY = Math.max(maxY, y);
                  foundCutContourPaths = true;
                }
              }
            }
            
            if (foundCutContourPaths && minX !== Infinity) {
              const widthPoints = maxX - minX;
              const heightPoints = maxY - minY;
              
              // Convert points to inches (72 points = 1 inch)
              const widthInches = widthPoints / 72;
              const heightInches = heightPoints / 72;
              
              layerInfo.cutContourDimensions = {
                widthInches: Math.round(widthInches * 100) / 100,
                heightInches: Math.round(heightInches * 100) / 100,
                boundingBox: {
                  x: minX,
                  y: minY,
                  width: widthPoints,
                  height: heightPoints
                }
              };
              
              console.log(`🔍 CutContour detected in layer "${groupName}"! Dimensions: ${layerInfo.cutContourDimensions.widthInches}" × ${layerInfo.cutContourDimensions.heightInches}"`);
              console.log(`📊 Detailed cut contour analysis:`);
              console.log(`   • Layer name: ${groupName}`);
              console.log(`   • Width: ${widthPoints} points = ${layerInfo.cutContourDimensions.widthInches} inches`);
              console.log(`   • Height: ${heightPoints} points = ${layerInfo.cutContourDimensions.heightInches} inches`);
              console.log(`   • Bounding box: (${minX}, ${minY}) to (${maxX}, ${maxY})`);
            }
          } catch (dimensionError) {
            console.warn('Could not extract cut contour dimensions:', dimensionError);
          }
        }
      }
    }

    // Also check page content for cut contour references and spot colors
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    
    // Look for CutContour in text content (sometimes embedded in PDF metadata)
    const textItems = content.items.map((item: any) => item.str).join(' ');
    if (textItems.toLowerCase().includes('cutcontour')) {
      layerInfo.hasCutContour = true;
      console.log('🎯 CutContour found in PDF text content/metadata');
    }

    // Check for spot colors that might be named CutContour
    try {
      const operatorList = await page.getOperatorList();
      console.log(`🔍 Analyzing ${operatorList.fnArray.length} PDF operations for spot colors...`);
      
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        const args = operatorList.argsArray[i];
        
        // Check for color space operations that might reference CutContour
        if (fn === pdfjsLib.OPS.setFillColorSpace || fn === pdfjsLib.OPS.setStrokeColorSpace) {
          if (args && args.length > 0) {
            const colorSpaceName = args[0];
            console.log(`🎨 Found color space: "${colorSpaceName}"`);
            
            if (typeof colorSpaceName === 'string') {
              const normalizedColorName = colorSpaceName.toLowerCase().trim();
              if (normalizedColorName.includes('cutcontour') ||
                  normalizedColorName === 'cutcontour' ||
                  normalizedColorName.startsWith('cutcontour')) {
                layerInfo.hasCutContour = true;
                console.log(`✅ CutContour found as spot color: "${colorSpaceName}"`);
                break;
              }
            }
          }
        }
        
        // Also check for color names in other operations
        if (fn === pdfjsLib.OPS.setFillColor || fn === pdfjsLib.OPS.setStrokeColor) {
          if (args && args.length > 0) {
            const colorArgs = args.join(',');
            console.log(`🎨 Color operation found: ${colorArgs}`);
          }
        }
      }
    } catch (spotColorError) {
      console.warn('Could not check for spot colors:', spotColorError);
    }

    console.log(`✅ PDF layer detection completed for: ${file.name}`);
    console.log(`📊 Final results: ${layerInfo.hasCutContour ? 'CutContour1 found' : 'No CutContour1 found'}`);
    
    return layerInfo;
    
  } catch (error) {
    console.error(`❌ Error detecting PDF layers in ${file.name}:`, error);
    return {
      hasCutContour: false,
      layerNames: [],
      totalLayers: 0
    };
  }
}

export async function analyzePDFForCutLines(file: File): Promise<{
  hasCutLines: boolean;
  layerInfo: LayerInfo;
  recommendations: string[];
}> {
  const layerInfo = await detectCutContourLayers(file);
  const recommendations: string[] = [];
  
  if (!layerInfo.hasCutContour) {
    recommendations.push('No CutContour layer detected. Please ensure your cut lines are on a layer named "CutContour", "CutContour1", or similar.');
    recommendations.push('Cut lines can also be defined as a spot color named "CutContour".');
    recommendations.push('Cut lines should use the green stroke color (#91c848) for proper identification.');
  }
  
  if (layerInfo.totalLayers === 0) {
    recommendations.push('No layers detected in PDF. Consider saving with layers preserved.');
  }
  
  if (layerInfo.layerNames.length > 0 && !layerInfo.hasCutContour) {
    recommendations.push(`Found layers: ${layerInfo.layerNames.join(', ')}. None appear to be cut contour layers.`);
  }

  return {
    hasCutLines: layerInfo.hasCutContour,
    layerInfo,
    recommendations
  };
}

// Helper function to check if a file is PDF
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || 
         file.type === 'application/x-pdf' ||
         file.name.toLowerCase().endsWith('.pdf');
}

// Color utilities for cut line validation
export const CUT_CONTOUR_COLOR = '#91c848'; // Your green cut line color

export function validateCutContourColor(color: string): boolean {
  // Normalize color formats and check if it matches the cut contour color
  const normalizedColor = color.toLowerCase().replace(/\s/g, '');
  const targetColor = CUT_CONTOUR_COLOR.toLowerCase();
  
  return normalizedColor === targetColor ||
         normalizedColor === targetColor.replace('#', '') ||
         normalizedColor.includes('91c848');
} 