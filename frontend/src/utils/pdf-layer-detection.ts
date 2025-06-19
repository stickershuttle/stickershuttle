// PDF Layer Detection Utility
// Specifically looks for CutContour1 layers with green stroke color

interface LayerInfo {
  hasCutContour: boolean;
  layerNames: string[];
  cutContourColor?: string;
  totalLayers: number;
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
      const groups = optionalContentConfig.getGroups();
      layerInfo.totalLayers = groups.length;
      
      for (const group of groups) {
        const groupName = group.name || '';
        layerInfo.layerNames.push(groupName);
        
        // Check if this layer is CutContour1
        if (groupName.toLowerCase().includes('cutcontour1') || 
            groupName.toLowerCase().includes('cut contour 1') ||
            groupName.toLowerCase().includes('cutcontour_1')) {
          layerInfo.hasCutContour = true;
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