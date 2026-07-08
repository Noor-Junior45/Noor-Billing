import { Sale, Customer } from "../types";
import { StoreService } from "./storeService";

export const generateInvoicePDF = async (sale: Sale, forceDownloadOrMode?: boolean | 'print' | 'download' | 'blob') => {
    // @ts-ignore
    const jspdf = window.jspdf;

    if (typeof jspdf === 'undefined') {
        alert("PDF Library not loaded yet. Check internet connection.");
        return;
    }

    let mode: 'print' | 'download' | 'blob' = 'download';
    if (typeof forceDownloadOrMode === 'string') {
        mode = forceDownloadOrMode;
    } else if (forceDownloadOrMode === true) {
        mode = 'download';
    }

    const settings = await StoreService.getSettings();
    const { jsPDF } = jspdf;
    // @ts-ignore
    const doc = new jsPDF();
    const pageWidth = 210;
    const pageHeight = 297;

    // Set page background to elegant off-white (#F8F7F4)
    doc.setFillColor(248, 247, 244);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // --- Elegant Container Card Background (#FAF9F6) ---
    // Draw card container with border from X=15 to X=195 (width 180mm)
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(220, 219, 215); // subtle border
    doc.roundedRect(15, 12, 180, pageHeight - 24, 2, 2, 'FD');

    let currentY = 24;

    // Helper to draw a dashed line
    const drawDashedDivider = (yPos: number) => {
        doc.setLineDashPattern([2, 2], 0);
        doc.setDrawColor(210, 209, 205);
        doc.line(22, yPos, pageWidth - 22, yPos);
        doc.setLineDashPattern([], 0); // Reset dash
    };

    // Helper to draw a solid divider line
    const drawSolidDivider = (yPos: number) => {
        doc.setDrawColor(230, 229, 225);
        doc.line(22, yPos, pageWidth - 22, yPos);
    };

    // Helper to check for page break and handle background continuation
    const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > 275) {
            doc.addPage();
            // Draw backgrounds on new page
            doc.setFillColor(248, 247, 244);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.setFillColor(250, 249, 246);
            doc.setDrawColor(220, 219, 215);
            doc.roundedRect(15, 12, 180, pageHeight - 24, 2, 2, 'FD');
            currentY = 24;
        }
    };

    // --- 1. Top Header (Store Details) ---
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(26, 26, 24); // #1A1A18
    doc.text(settings.storeName || "Noor Warehouse", pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;

    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 118); // Muted gray
    if (settings.storeAddress) {
        doc.text(settings.storeAddress, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4.5;
    }
    if (settings.storePhone) {
        doc.text(`Phone: ${settings.storePhone}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4.5;
    }

    // --- Electronic Invoice Badge ---
    currentY += 3;
    doc.setFillColor(235, 242, 234); // light green
    doc.setDrawColor(215, 228, 213);
    doc.roundedRect((pageWidth - 55) / 2, currentY, 55, 6.5, 1, 1, 'FD');

    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(45, 90, 39); // green
    doc.text("ELECTRONIC INVOICE", pageWidth / 2, currentY + 4.5, { align: 'center' });
    currentY += 13;

    // Dashed divider line
    drawDashedDivider(currentY);
    currentY += 7;

    // --- 2. Invoice Metadata ---
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 118);
    doc.text("INVOICE ID", 24, currentY);
    doc.text("TIMESTAMP", pageWidth - 24, currentY, { align: 'right' });

    currentY += 4.5;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 24);
    doc.text(sale.id.slice(0, 10).toUpperCase(), 24, currentY);
    doc.text(new Date(sale.timestamp).toLocaleString(), pageWidth - 24, currentY, { align: 'right' });

    currentY += 7;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 118);
    doc.text("CUSTOMER NAME", 24, currentY);
    doc.text("SERVED BY", pageWidth - 24, currentY, { align: 'right' });

    currentY += 4.5;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 24);
    doc.text(sale.customerName, 24, currentY);
    doc.text(sale.servedBy || "Staff", pageWidth - 24, currentY, { align: 'right' });
    currentY += 8;

    // Solid divider line
    drawSolidDivider(currentY);
    currentY += 7;

    // --- 3. Purchased Products Header ---
    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 118);
    doc.text("PURCHASED PRODUCTS", 24, currentY);
    currentY += 7;

    // --- 4. Products List ---
    sale.items.forEach((item) => {
        checkPageBreak(16);

        // Draw item name in times bold
        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.setTextColor(26, 26, 24);
        
        // Truncate name if too long for layout width
        let displayName = item.name;
        if (displayName.length > 35) displayName = displayName.slice(0, 32) + "...";
        doc.text(displayName, 24, currentY);

        // Draw line total on the far right
        const itemPrice = item.customPrice || item.sellPrice;
        const disc = item.discount || 0;
        const lineTotal = (itemPrice - disc) * item.quantity;
        
        doc.setFont("courier", "bold");
        doc.setFontSize(11);
        doc.setTextColor(26, 26, 24);
        doc.text(`₹${lineTotal.toLocaleString()}`, pageWidth - 24, currentY, { align: 'right' });

        currentY += 4.5;

        // Draw quantity/price detail line
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 118);
        const detailText = `${item.quantity} ${item.unit || 'pcs'} x ₹${itemPrice.toLocaleString()}`;
        doc.text(detailText, 24, currentY);

        // Draw discount tag if any
        if (disc > 0) {
            doc.setFillColor(254, 242, 242); // light red
            doc.setDrawColor(254, 226, 226);
            doc.roundedRect(80, currentY - 3.2, 26, 4.2, 0.5, 0.5, 'FD');
            
            doc.setFont("courier", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(185, 28, 28); // red
            doc.text(`-₹${disc} Disc`, 81.5, currentY - 0.2);
        }

        currentY += 8;
    });

    // Dashed divider line
    currentY += 1;
    checkPageBreak(8);
    drawDashedDivider(currentY);
    currentY += 7;

    // --- 5. Financial Summary ---
    const drawSummaryRow = (label: string, value: string, fontType = "courier", fontStyle = "normal", size = 10, textColor = [26, 26, 24]) => {
        checkPageBreak(8);
        doc.setFont(fontType, fontStyle);
        doc.setFontSize(size);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(label, 24, currentY);
        doc.text(value, pageWidth - 24, currentY, { align: 'right' });
        currentY += 5.5;
    };

    drawSummaryRow("Subtotal:", `₹${sale.subtotal.toLocaleString()}`, "courier", "normal", 10, [120, 120, 118]);
    if (sale.tax > 0) {
        drawSummaryRow("Tax (GST):", `₹${sale.tax.toLocaleString()}`, "courier", "normal", 10, [120, 120, 118]);
    }

    currentY += 1.5;
    // Total Invoice Amount: larger font and times bold
    drawSummaryRow("Total Invoice Amount:", `₹${sale.total.toLocaleString()}`, "times", "bold", 13, [26, 26, 24]);

    if (sale.amountPaid !== undefined) {
        drawSummaryRow("Amount Paid:", `₹${sale.amountPaid.toLocaleString()}`, "courier", "bold", 10, [45, 90, 39]); // green text
    }

    const outstanding = sale.total - (sale.amountPaid || 0);
    if (sale.amountPaid !== undefined && outstanding > 0.01) {
        currentY += 1.5;
        checkPageBreak(12);

        // Draw outstanding balance box (light red bg)
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 226, 226);
        doc.roundedRect(24, currentY, pageWidth - 48, 8, 1, 1, 'FD');

        doc.setFont("courier", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(185, 28, 28);
        doc.text("Outstanding Balance Due:", 28, currentY + 5.2);
        doc.text(`₹${outstanding.toLocaleString()}`, pageWidth - 28, currentY + 5.2, { align: 'right' });
        currentY += 12;
    }

    // --- 6. Footer (Receipt Header & Footer) ---
    currentY += 2;
    checkPageBreak(15);
    drawSolidDivider(currentY);
    currentY += 7;

    if (settings.receiptHeader) {
        checkPageBreak(8);
        doc.setFont("courier", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 118);
        doc.text(settings.receiptHeader.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;
    }

    if (settings.receiptFooter) {
        checkPageBreak(8);
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(45, 90, 39); // green text
        doc.text(`"${settings.receiptFooter}"`, pageWidth / 2, currentY, { align: 'center' });
    }

    // --- 7. Output / Deliver Logic ---
    if (mode === 'blob') {
        return doc.output('blob');
    }

    if (settings.directPrintEnabled && mode !== 'download') {
        try {
            // Direct Print: Use blob URL and print
            const blob = doc.output('blob');
            const url = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            iframe.onload = () => {
                try {
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.warn("Direct printing blocked or unsupported, falling back to download", e);
                    doc.save(`Invoice_${sale.id.slice(0, 8).toUpperCase()}.pdf`);
                }
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 1000);
            };
        } catch (err) {
            console.warn("Direct print initialization failed, downloading", err);
            doc.save(`Invoice_${sale.id.slice(0, 8).toUpperCase()}.pdf`);
        }
    } else {
        // Standard Download
        doc.save(`Invoice_${sale.id.slice(0, 8).toUpperCase()}.pdf`);
    }
};

export const generateCustomerStatementPDF = async (customer: Customer, sales: Sale[]) => {
    // @ts-ignore
    const jspdf = window.jspdf;
    if (typeof jspdf === 'undefined') return;

    const settings = await StoreService.getSettings();
    const { jsPDF } = jspdf;
    // @ts-ignore
    const doc = new jsPDF();
    const pageWidth = 210;

    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55);
    doc.text("Statement of Account", 14, 20);

    doc.setFontSize(10);
    doc.text(`Customer: ${customer.name}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);

    const tableColumn = ["Date", "Invoice #", "Status", "Amount"];
    const tableRows = sales.map(sale => {
        const paid = sale.amountPaid !== undefined ? sale.amountPaid : sale.total;
        const due = sale.total - paid;
        return [
            new Date(sale.timestamp).toLocaleDateString(),
            sale.id.slice(0, 8).toUpperCase(),
            due > 0.01 ? "Pending" : "Paid",
            `${settings.currencySymbol || '₹'} ${sale.total.toFixed(2)}`
        ];
    });

    // @ts-ignore
    doc.autoTable({
        startY: 50,
        head: [tableColumn],
        body: tableRows
    });

    doc.save(`Statement_${customer.name.replace(/\s+/g, '_')}.pdf`);
};
