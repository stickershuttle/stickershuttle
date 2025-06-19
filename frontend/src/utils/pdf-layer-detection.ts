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
  try {
    // Dynamically import PDF.js to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
      
      for (const group of groups) {
        const groupName = group.name || '';
        layerInfo.layerNames.push(groupName);
        
        // Check if this layer is CutContour1
        if (groupName.toLowerCase().includes('cutcontour1') || 
            groupName.toLowerCase().includes('cut contour 1') ||
            groupName.toLowerCase().includes('cutcontour_1')) {
          layerInfo.hasCutContour = true;
          
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
              
              console.log(`🔍 CutContour1 detected! Dimensions: ${layerInfo.cutContourDimensions.widthInches}" × ${layerInfo.cutContourDimensions.heightInches}"`);
            }
          } catch (dimensionError) {
            console.warn('Could not extract cut contour dimensions:', dimensionError);
          }
        }
      }
    }

    // Also check page content for cut contour references
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    
    // Look for CutContour1 in text content (sometimes embedded in PDF metadata)
    const textItems = content.items.map((item: any) => item.str).join(' ');
    if (textItems.toLowerCase().includes('cutcontour1')) {
      layerInfo.hasCutContour = true;
    }

    return layerInfo;
    
  } catch (error) {
    console.error('Error detecting PDF layers:', error);
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
    recommendations.push('No CutContour1 layer detected. Please ensure your cut lines are on a layer named "CutContour1".');
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
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
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