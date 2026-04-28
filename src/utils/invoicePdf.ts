import { Platform } from 'react-native';
import type { CustomerAddress, SaleOrder, SaleOrderItem } from '../types';

/**
 * Builds the HTML used to render the downloadable PDF invoice. Mirrors
 * the layout of `Rythubidda-UI/src/pages/Invoice.tsx` (the web's PDF
 * template) — same company info, same address columns, same item table
 * with CGST/SGST, same totals block, same "system-generated" footer —
 * so the mobile-generated PDF is visually identical to the web's.
 */

interface BuildArgs {
  invoiceNumber: string | number;
  invoiceDate?: string;
  order: SaleOrder | undefined;
  items: SaleOrderItem[];
}

const COMPANY = {
  name: 'RYTHUBIDDA CEREALS PRIVATE LIMITED',
  address:
    'Plot 580, H.NO.6-580, Vivekananda Nagar Colony, Kukatpally, Hyderabad 500072.',
  email: 'rythubiddacereals@gmail.com',
  gstin: '36AANCR7159M1ZI',
  fssai: '13625034000386',
};

interface ItemTaxes {
  baseAmount: number;
  cgst: number;
  sgst: number;
  total: number;
}

/**
 * Reverse-calculates CGST/SGST/base from a GST-inclusive line total.
 * Matches the formula used by the web (see `calculateItemTaxes`):
 *   base = total / 1.18; cgst = base * 0.09; sgst = base * 0.09.
 */
function itemTaxes(unitPriceWithGst: number, qty: number): ItemTaxes {
  const total = unitPriceWithGst * qty;
  const base = total / 1.18;
  return {
    baseAmount: base,
    cgst: base * 0.09,
    sgst: base * 0.09,
    total,
  };
}

function formatINR(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function formatDate(input: string | Date | undefined | null): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  // dd MMM yyyy — same shape the web uses.
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addressBlock(label: string, addr?: CustomerAddress): string {
  if (!addr) {
    return `
      <div class="addr-col">
        <div class="addr-title">${label}</div>
        <div class="addr-empty">Not available</div>
      </div>`;
  }
  const lines = [
    `${escapeHtml(addr.firstname ?? '')} ${escapeHtml(addr.lastname ?? '')}`.trim(),
    escapeHtml(addr.address1),
    addr.address2 ? escapeHtml(addr.address2) : '',
    `${escapeHtml(addr.city)}, ${escapeHtml(addr.state)}, ${escapeHtml(addr.postcode)}`,
    addr.telephone ? `Ph: ${escapeHtml(addr.telephone)}` : '',
  ]
    .filter(Boolean)
    .map(l => `<div>${l}</div>`)
    .join('');
  return `
    <div class="addr-col">
      <div class="addr-title">${label}</div>
      <div class="addr-body">${lines}</div>
    </div>`;
}

export function buildInvoiceHtml({
  invoiceNumber,
  invoiceDate,
  order,
  items,
}: BuildArgs): string {
  let totalBaseAmount = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalItemsAmount = 0;

  const rows = items
    .map((it, idx) => {
      const qty = it.qty ?? 0;
      const linePrice =
        it.subtotal != null
          ? it.subtotal
          : (it.price ?? 0) * qty;
      const unitWithGst = qty > 0 ? linePrice / qty : 0;
      const t = itemTaxes(unitWithGst, qty);

      totalItemsAmount += linePrice;
      totalBaseAmount += t.baseAmount;
      totalCGST += t.cgst;
      totalSGST += t.sgst;

      const name = escapeHtml(it.productName ?? it.name ?? 'Product');
      const opt = it.qtyOptionLabel ? escapeHtml(it.qtyOptionLabel) : '';
      const qtyCell = opt ? `${opt} - ${qty}` : `${qty}`;

      return `
        <tr>
          <td class="c">${idx + 1}</td>
          <td>
            <div class="item-name">${name}</div>
            ${opt ? `<div class="item-opt">${opt}</div>` : ''}
          </td>
          <td class="c">${qtyCell}</td>
          <td class="r">₹${formatINR(t.baseAmount / Math.max(qty, 1))}</td>
          <td class="r">₹${formatINR(t.baseAmount)}</td>
          <td class="r">₹${formatINR(t.cgst)}</td>
          <td class="r">₹${formatINR(t.sgst)}</td>
          <td class="r b">₹${formatINR(t.total)}</td>
        </tr>`;
    })
    .join('');

  const shipping =
    (order?.shippingAmount ?? order?.shippingCost ?? 0) || 0;
  const grandTotal =
    order?.grandTotal ??
    order?.orderTotal ??
    totalItemsAmount + shipping;

  const orderedOn = formatDate(invoiceDate ?? order?.createdAt);

  // Note: we intentionally write the styles inline at module scope so the
  // PDF renderer (which has no JS) doesn't need to wait for CSS files.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(invoiceNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; margin: 0; padding: 16px; }
  .head { text-align: center; margin-bottom: 14px; }
  .company { font-size: 16px; font-weight: 800; letter-spacing: 0.3px; }
  .brand { font-size: 22px; font-weight: 800; color: #6A3F22; margin-bottom: 4px; }
  .meta { display: flex; justify-content: space-between; font-size: 10px; margin: 8px 0 6px; }
  .meta b { font-weight: 700; }
  .invoiceNum { font-size: 16px; font-weight: 800; margin-top: 4px; }

  .addr-grid { display: flex; gap: 12px; padding: 12px 0; border-top: 2px solid #d1d5db; border-bottom: 2px solid #d1d5db; margin-bottom: 14px; }
  .addr-col { flex: 1; font-size: 10px; line-height: 1.4; }
  .addr-title { font-weight: 700; font-size: 11px; margin-bottom: 4px; }
  .addr-body div { margin-bottom: 1px; }
  .addr-empty { color: #6b7280; font-style: italic; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #d1d5db; padding: 5px 6px; }
  th { background: #f3f4f6; font-weight: 700; font-size: 10px; text-align: left; }
  th.c, td.c { text-align: center; }
  th.r, td.r { text-align: right; }
  td.b { font-weight: 700; }
  .item-name { font-weight: 600; }
  .item-opt { color: #6b7280; font-size: 9px; margin-top: 1px; }

  .totals { margin-top: 14px; padding-top: 10px; border-top: 2px solid #d1d5db; display: flex; justify-content: flex-end; }
  .totals-box { width: 280px; font-size: 10px; }
  .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .totals-row b { font-weight: 600; }
  .totals-grand { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; padding-top: 6px; margin-top: 4px; border-top: 2px solid #d1d5db; }

  .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #4b5563; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">RYTHU BIDDA</div>
    <div class="company">${escapeHtml(COMPANY.name)}</div>
    <div class="meta">
      <span><b>Ordered On:</b> ${escapeHtml(orderedOn)}</span>
      <span><b>GSTIN:</b> ${escapeHtml(COMPANY.gstin)}</span>
      <span><b>FSSAI License No:</b> ${escapeHtml(COMPANY.fssai)}</span>
    </div>
    <div class="invoiceNum">Order Invoice #${escapeHtml(invoiceNumber)}</div>
  </div>

  <div class="addr-grid">
    <div class="addr-col">
      <div class="addr-title">RythuBidda Cereals</div>
      <div class="addr-body">
        <div>${escapeHtml(COMPANY.address)}</div>
        <div>Email: ${escapeHtml(COMPANY.email)}</div>
      </div>
    </div>
    ${addressBlock('Shipping Address', order?.shippingAddress ?? order?.address)}
    ${addressBlock('Billing Address', order?.billingAddress ?? order?.shippingAddress ?? order?.address)}
  </div>

  <table>
    <thead>
      <tr>
        <th class="c">S.No</th>
        <th>Item</th>
        <th class="c">Quantity</th>
        <th class="r">Unit Price</th>
        <th class="r">Total Units Price</th>
        <th class="r">CGST (9%)</th>
        <th class="r">SGST (9%)</th>
        <th class="r">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="8" class="c">No items recorded.</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Sub Total</span><b>₹${formatINR(totalBaseAmount)}</b></div>
      <div class="totals-row"><span>CGST (9%)</span><b>₹${formatINR(totalCGST)}</b></div>
      <div class="totals-row"><span>SGST (9%)</span><b>₹${formatINR(totalSGST)}</b></div>
      <div class="totals-row"><span>Shipping</span><b>${shipping === 0 ? '₹0.00' : `₹${formatINR(shipping)}`}</b></div>
      <div class="totals-grand"><span>TOTAL</span><span>₹${formatINR(grandTotal)}</span></div>
    </div>
  </div>

  <div class="footer">
    Note: This is a system-generated invoice and does not require a signature.
  </div>
</body>
</html>`;
}

export interface GeneratedPdf {
  /** Absolute path of the file inside the app's private storage. */
  filePath: string;
  /** The display filename, including the `.pdf` extension. */
  fileName: string;
  /**
   * On Android, when the file has been published to the public `Downloads`
   * folder via MediaStore, this is the user-visible URI. Will be `undefined`
   * on iOS or if MediaStore publishing failed (we keep `filePath` as the
   * authoritative location in that case).
   */
  publicPath?: string;
}

/**
 * Generates the invoice PDF on disk and (on Android) republishes a copy
 * to the public `Downloads` folder via MediaStore so it's directly
 * visible in the system Files app.
 *
 * `react-native-html-to-pdf` and `react-native-blob-util` are loaded
 * lazily so the rest of the app keeps working even if the native modules
 * haven't been linked yet (i.e. the user hasn't rebuilt after adding the
 * deps). Returns `null` only when PDF generation itself can't run.
 */
export async function generateInvoicePdf(
  args: BuildArgs,
): Promise<GeneratedPdf | null> {
  // Dynamic require so the bundler doesn't fail when the native modules
  // aren't installed; we surface a typed result instead.
  let RNHTMLtoPDF: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNHTMLtoPDF = require('react-native-html-to-pdf').default;
  } catch {
    return null;
  }
  if (!RNHTMLtoPDF || typeof RNHTMLtoPDF.convert !== 'function') return null;

  const html = buildInvoiceHtml(args);
  const safeName = `Invoice-${String(args.invoiceNumber).replace(/[^A-Za-z0-9_-]/g, '')}`;

  const result = await RNHTMLtoPDF.convert({
    html,
    fileName: safeName,
    // App's private Documents folder — guaranteed writable, no permissions.
    // We then republish the file into public Downloads on Android below.
    directory: Platform.OS === 'android' ? 'Documents' : undefined,
    base64: false,
    height: 842, // A4 height in pt
    width: 595, // A4 width in pt
    padding: 12,
  });

  if (!result?.filePath) return null;

  const filePath = result.filePath as string;
  const fileName = `${safeName}.pdf`;

  // ─────────────────────────────────────────────────────────────────────
  // Android-only: republish to the public Download folder via MediaStore.
  // This is the modern (Android 10+ / scoped-storage friendly) way to land
  // a file in the user's Downloads — no WRITE_EXTERNAL_STORAGE permission
  // needed, no SAF picker. Falls back silently to the private path if the
  // module isn't linked yet so we never block the primary flow.
  // ─────────────────────────────────────────────────────────────────────
  let publicPath: string | undefined;
  if (Platform.OS === 'android') {
    let RNBlobUtil: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      RNBlobUtil = require('react-native-blob-util').default;
    } catch {
      RNBlobUtil = null;
    }
    if (RNBlobUtil?.MediaCollection?.copyToMediaStore) {
      try {
        const stored = await RNBlobUtil.MediaCollection.copyToMediaStore(
          {
            name: fileName,
            // Empty parentFolder = root of the Download collection.
            parentFolder: '',
            mimeType: 'application/pdf',
          },
          'Download',
          filePath,
        );
        // Returns a MediaStore URI on success; we keep both for the UI.
        if (typeof stored === 'string' && stored.length > 0) {
          publicPath = stored;
        }
      } catch {
        // Best-effort — leave publicPath undefined and let the caller fall
        // back to opening the share sheet from filePath.
      }
    }
  }

  return { filePath, fileName, publicPath };
}
