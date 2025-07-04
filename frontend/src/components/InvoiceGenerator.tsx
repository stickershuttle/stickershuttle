import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customFiles?: string[];
  calculatorSelections?: any;
  customerNotes?: string;
}

interface InvoiceData {
  orderNumber: string;
  id?: string;
  orderDate: string;
  orderStatus: string;
  totalPrice: number;
  currency: string;
  items: InvoiceItem[];
  trackingNumber?: string;
  trackingCompany?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  };
  // Shopify billing address data
  billingAddress?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };
  // Customer email from order
  customerEmail?: string;
}

const useInvoiceGenerator = (invoiceData: InvoiceData) => {
  
  const generatePDF = async (action: 'print' | 'download') => {
    console.log('🧾 Starting PDF generation:', action);
    console.log('🧾 Invoice data:', invoiceData);
    
    // Validate invoice data - improved validation with debugging
    console.log('🧾 Raw invoice data received:', invoiceData);
    const orderNumber = invoiceData.orderNumber || invoiceData.id || 'SS-FALLBACK';
    console.log('🧾 Final order number for invoice:', orderNumber);
    
    if (!orderNumber || orderNumber === 'SS-FALLBACK') {
      console.error('❌ Missing order number in invoice data');
      console.error('❌ Invoice data keys:', Object.keys(invoiceData));
      console.error('❌ Invoice orderNumber:', invoiceData.orderNumber);
      console.error('❌ Invoice id:', invoiceData.id);
      alert('Error: Order number is missing. Please refresh the page and try again.');
      return;
    }
    
    if (!invoiceData.items || invoiceData.items.length === 0) {
      console.error('❌ No items found in invoice data');
      alert('Error: No order items found. Please refresh the page and try again.');
      return;
    }
    
    // Create a hidden div for the invoice
    const invoiceElement = document.createElement('div');
    invoiceElement.style.position = 'absolute';
    invoiceElement.style.left = '-9999px';
    invoiceElement.style.top = '0';
    invoiceElement.style.width = '210mm'; // A4 width
    invoiceElement.style.backgroundColor = 'white';
    invoiceElement.style.color = 'black';
    invoiceElement.style.fontFamily = 'Arial, sans-serif';
    invoiceElement.style.fontSize = '12px';
    invoiceElement.style.lineHeight = '1.4';
    invoiceElement.style.padding = '20px';

    // Generate invoice HTML
    invoiceElement.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; background: white; color: black;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #030140; padding-bottom: 20px;">
          <div style="flex: 1; display: flex; align-items: center;">
            <div style="display: flex; align-items: center;">
              <img src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751567428/LogoDarktGreyStickerShuttle_lpvvnc.png" alt="Sticker Shuttle" style="height: 40px; width: auto; margin-right: 10px;" />
            </div>
          </div>
          <div style="text-align: right; flex: 1;">
            <h1 style="margin: 0; color: #030140; font-size: 28px; font-weight: bold;">INVOICE</h1>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">${orderNumber}</p>
          </div>
        </div>

        <!-- Company & Customer Info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="width: 48%;">
            <h3 style="margin: 0 0 10px 0; color: #030140; font-size: 16px;">From:</h3>
            <div style="color: #333; line-height: 1.6;">
              <strong>Sticker Shuttle</strong><br/>
              2981 S Harrison St.<br/>
              Denver, CO 80210<br/>
              Email: support@stickershuttle.com<br/>
              Website: stickershuttle.com
            </div>
          </div>
          <div style="width: 48%;">
            <h3 style="margin: 0 0 10px 0; color: #030140; font-size: 16px;">Bill To:</h3>
            <div style="color: #333; line-height: 1.6;">
              ${(() => {
                // Use billing address from Shopify if available, otherwise fall back to customer info
                const billing = invoiceData.billingAddress;
                const customer = invoiceData.customerInfo;
                const email = invoiceData.customerEmail || customer?.email;
                
                if (billing) {
                  return `
                    ${billing.first_name || billing.last_name ? `<strong>${[billing.first_name, billing.last_name].filter(Boolean).join(' ')}</strong><br/>` : ''}
                    ${billing.company ? `${billing.company}<br/>` : ''}
                    ${email ? `${email}<br/>` : ''}
                    ${billing.phone ? `${billing.phone}<br/>` : ''}
                    ${billing.address1 ? `${billing.address1}<br/>` : ''}
                    ${billing.address2 ? `${billing.address2}<br/>` : ''}
                    ${billing.city || billing.province || billing.zip ? `${[billing.city, billing.province, billing.zip].filter(Boolean).join(', ')}<br/>` : ''}
                    ${billing.country ? `${billing.country}` : ''}
                  `;
                } else if (customer) {
                  return `
                    ${customer.name ? `<strong>${customer.name}</strong><br/>` : ''}
                    ${email ? `${email}<br/>` : ''}
                    ${customer.phone ? `${customer.phone}<br/>` : ''}
                    ${customer.address?.line1 ? `${customer.address.line1}<br/>` : ''}
                    ${customer.address?.line2 ? `${customer.address.line2}<br/>` : ''}
                    ${customer.address?.city || customer.address?.state || customer.address?.zip ? `${[customer.address.city, customer.address.state, customer.address.zip].filter(Boolean).join(', ')}<br/>` : ''}
                    ${customer.address?.country ? `${customer.address.country}` : ''}
                  `;
                } else {
                  return `
                    ${email ? `${email}<br/>` : ''}
                    <em style="color: #999;">Billing address not available</em>
                  `;
                }
              })()}
            </div>
          </div>
        </div>

        <!-- Order Details -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <div>
            <strong style="color: #030140;">Order Date:</strong><br/>
            ${new Date(invoiceData.orderDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          ${invoiceData.trackingNumber ? `
          <div>
            <strong style="color: #030140;">Tracking:</strong><br/>
            ${invoiceData.trackingNumber}
            ${invoiceData.trackingCompany ? `<br/><small>(${invoiceData.trackingCompany})</small>` : ''}
          </div>
          ` : ''}
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #030140; color: white;">
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd; width: 80px;">Image</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Item</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd; width: 80px;">Qty</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd; width: 100px;">Unit Price</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd; width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items.map((item, index) => `
              <tr style="border-bottom: 1px solid #ddd; ${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; vertical-align: top;">
                  <div style="width: 60px; height: 60px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid #ddd; overflow: hidden; background: #f8f9fa;">
                    ${item.customFiles && item.customFiles[0] ? `
                      <img src="${item.customFiles[0]}" 
                           alt="${item.productName}" 
                           style="max-width: 100%; max-height: 100%; object-fit: contain;" 
                           onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'font-size: 10px; color: #999;\\'>No Image</span>';" />
                    ` : `
                      <span style="font-size: 10px; color: #999;">No Image</span>
                    `}
                  </div>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">
                                    <strong style="color: #030140;">${item.productName}</strong>
                  ${(() => {
                    if (!item.calculatorSelections) return '';
                    
                    console.log('🧾 Invoice calculator selections for item:', item.productName, item.calculatorSelections);
                    
                    const formatKey = (k: string) => {
                      switch (k.toLowerCase()) {
                        case 'sizepreset': return 'Size';
                        case 'whiteoption': return 'White Ink';
                        case 'whitebase': return 'White Ink';
                        case 'cut': return 'Shape';
                        case 'material': return 'Material';
                        case 'size': return 'Size';
                        case 'rush': return 'Rush Order';
                        case 'proof': return 'Proof';
                        case 'instagram': return 'Instagram';
                        default: return k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1').trim();
                      }
                    };
                    
                    const specs = Object.entries(item.calculatorSelections)
                      .filter(([key, value]: [string, any]) => {
                        const hasValue = value && (
                          (typeof value === 'object' && (value.displayValue || value.value)) ||
                          (typeof value === 'string' && value.trim() !== '') ||
                          (typeof value === 'number') ||
                          (typeof value === 'boolean')
                        );
                        console.log('🧾 Filter check for ' + key + ':', value, 'hasValue:', hasValue);
                        return hasValue;
                      })
                      .map(([key, value]: [string, any]) => {
                        let displayValue;
                        if (typeof value === 'object' && value !== null) {
                          displayValue = value.displayValue || value.value || String(value);
                        } else {
                          displayValue = String(value);
                        }
                        
                        console.log('🧾 Displaying ' + key + ':', displayValue);
                        return '• ' + formatKey(key) + ': ' + displayValue;
                      })
                      .join('<br/>');
                    
                    return specs ? '<div style="margin-top: 8px; font-size: 11px; color: #666;">' + specs + '</div>' : '';
                  })()}
                  ${item.customerNotes ? `
                    <div style="margin-top: 8px; font-size: 11px; color: #666; font-style: italic;">
                      Notes: ${item.customerNotes}
                    </div>
                  ` : ''}
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; vertical-align: top; font-weight: bold;">
                  ${item.quantity}
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right; vertical-align: top;">
                  $${item.unitPrice.toFixed(2)}
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right; vertical-align: top; font-weight: bold;">
                  $${item.totalPrice.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #ddd;">
              <span>Subtotal:</span>
              <span>$${(invoiceData.subtotal || invoiceData.items.reduce((sum, item) => sum + item.totalPrice, 0)).toFixed(2)}</span>
            </div>
            ${invoiceData.tax ? `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #ddd;">
              <span>Tax:</span>
              <span>$${invoiceData.tax.toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #ddd;">
              <span>Shipping:</span>
              <span>${(invoiceData.shipping === 0 || !invoiceData.shipping) ? 'FREE' : '$' + invoiceData.shipping.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #030140; font-weight: bold; font-size: 16px; color: #030140;">
              <span>Total:</span>
              <span>$${invoiceData.totalPrice.toFixed(2)} ${invoiceData.currency}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 11px;">
          <p style="margin: 5px 0;">Thank you for choosing Sticker Shuttle!</p>
          <p style="margin: 5px 0;">For questions about this invoice, contact us at support@stickershuttle.com</p>
          <p style="margin: 5px 0;">Visit us at stickershuttle.com</p>
        </div>
      </div>
    `;

    document.body.appendChild(invoiceElement);

    try {
      // Wait for images to load
      const images = invoiceElement.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true);
          } else {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
            // Timeout after 3 seconds
            setTimeout(() => resolve(true), 3000);
          }
        });
      }));

      // Generate canvas from HTML
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: invoiceElement.offsetWidth,
        height: invoiceElement.offsetHeight
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10; // 10mm top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20); // Account for margins

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      if (action === 'print') {
        // Open PDF in new window for printing
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        // Download PDF
        pdf.save(`invoice-${invoiceData.orderNumber.replace('#', '')}.pdf`);
      }

    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
      console.error('❌ Error details:', errorMessage);
      console.error('❌ Error stack:', errorStack);
      alert(`Error generating PDF: ${errorMessage}. Please try again or contact support.`);
    } finally {
      // Clean up
      try {
        if (invoiceElement && document.body.contains(invoiceElement)) {
          document.body.removeChild(invoiceElement);
        }
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
      }
    }
  };

  return {
    generatePrintPDF: () => generatePDF('print'),
    generateDownloadPDF: () => generatePDF('download')
  };
};

export default useInvoiceGenerator;
export type { InvoiceData, InvoiceItem }; 