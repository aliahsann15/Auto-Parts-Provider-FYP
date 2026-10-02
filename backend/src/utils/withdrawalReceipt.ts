import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { PNG } from 'pngjs'
import { IUser } from '../models/User'
import { IWithdrawal } from '../models/Withdrawal'

type PdfLine = { text: string; font?: 'regular' | 'bold'; size?: number; x?: number }

const AUTO_PARTS_BANK = {
  accountTitle: 'Auto Parts Providers',
  bankName: 'Auto Parts Providers Bank',
  accountNumber: '0123 4567 8901 234',
  branch: 'Main Branch'
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const LOGO_MAX_WIDTH = 180
const LOGO_MAX_HEIGHT = 80

const loadLogoImage = () => {
  try {
    const logoPath = path.resolve(__dirname, '../../../web/public/images/logo.png')
    const file = fs.readFileSync(logoPath)
    const png = PNG.sync.read(file)
    const width = png.width
    const height = png.height
    const widthRatio = LOGO_MAX_WIDTH / width
    const heightRatio = LOGO_MAX_HEIGHT / height
    const scaleRatio = Math.min(1, widthRatio, heightRatio)
    const displayWidth = Math.floor(width * scaleRatio)
    const displayHeight = Math.floor(height * scaleRatio)
    const pixelCount = width * height
    const rgbBuffer = Buffer.alloc(pixelCount * 3)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const srcIdx = (width * y + x) << 2
        const dstIdx = (width * y + x) * 3
        rgbBuffer[dstIdx] = png.data[srcIdx]
        rgbBuffer[dstIdx + 1] = png.data[srcIdx + 1]
        rgbBuffer[dstIdx + 2] = png.data[srcIdx + 2]
      }
    }
    return {
      width,
      height,
      displayWidth,
      displayHeight,
      stream: zlib.deflateSync(rgbBuffer),
    }
  } catch {
    return null
  }
}

const LOGO_IMAGE = loadLogoImage()

const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

const buildPdfStream = (lines: PdfLine[]): string => {
  const parts: string[] = []
  if (LOGO_IMAGE) {
    const logoX = (PAGE_WIDTH - LOGO_IMAGE.displayWidth) / 2
    const logoY = PAGE_HEIGHT - LOGO_IMAGE.displayHeight - 40
    parts.push('q')
    parts.push(`${LOGO_IMAGE.displayWidth} 0 0 ${LOGO_IMAGE.displayHeight} ${logoX} ${logoY} cm`)
    parts.push('/ImLogo Do')
    parts.push('Q')
  }
  parts.push('BT')
  let currentFont = ''
  let currentSize = -1
  let yPosition = 700
  const lineHeight = 26
  for (const line of lines) {
    const fontType = line.font === 'bold' ? '/F2' : '/F1'
    const fontSize = line.size || (line.font === 'bold' ? 16 : 12)
    if (fontType !== currentFont || fontSize !== currentSize) {
      parts.push(`${fontType} ${fontSize} Tf`)
      currentFont = fontType
      currentSize = fontSize
    }
    const xPosition = line.x ?? 72
    parts.push(`1 0 0 1 ${xPosition} ${yPosition} Tm`)
    parts.push(`(${escapePdfText(line.text)}) Tj`)
    yPosition -= lineHeight
  }
  parts.push('ET')
  return parts.join('\n') + '\n'
}

const buildPdfBuffer = (lines: PdfLine[]): Buffer => {
  const streamContent = buildPdfStream(lines)
  const streamLength = Buffer.byteLength(streamContent, 'utf8')

  const xObjectResource = LOGO_IMAGE
    ? '/XObject << /ImLogo 7 0 R >>'
    : ''

  const resourcesLine = `<< /Font << /F1 5 0 R /F2 6 0 R >>${LOGO_IMAGE ? ` ${xObjectResource}` : ''} >>`

  const font1 = Buffer.from(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`, 'utf8')
  const font2 = Buffer.from(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`, 'utf8')
  const contentObject = Buffer.from(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`, 'utf8')
  const header = Buffer.from('%PDF-1.4\n', 'utf8')
  const bodyParts: Buffer[] = [header]
  const offsets: number[] = []
  let cursor = header.length

  const pushObject = (content: Buffer) => {
    offsets.push(cursor)
    bodyParts.push(content)
    cursor += content.length
  }

  pushObject(Buffer.from(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`, 'utf8'))
  pushObject(Buffer.from(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`, 'utf8'))
  pushObject(
    Buffer.from(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R /Resources ${resourcesLine} >>\nendobj\n`,
      'utf8',
    ),
  )
  pushObject(contentObject)
  pushObject(font1)
  pushObject(font2)

  if (LOGO_IMAGE) {
    const headerImage = Buffer.from(
      `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${LOGO_IMAGE.width} /Height ${LOGO_IMAGE.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${LOGO_IMAGE.stream.length} /Filter /FlateDecode >>\n`,
      'utf8',
    )
    const footerImage = Buffer.from('endstream\nendobj\n', 'utf8')
    const imageObject = Buffer.concat([headerImage, LOGO_IMAGE.stream, footerImage])
    pushObject(imageObject)
  }

  const xrefLines = ['xref', `0 ${offsets.length + 1}`, '0000000000 65535 f ']
  for (const offset of offsets) {
    xrefLines.push(`${offset.toString().padStart(10, '0')} 00000 n `)
  }

  const trailer = `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`
  bodyParts.push(Buffer.from(xrefLines.join('\n') + '\n', 'utf8'))
  bodyParts.push(Buffer.from(trailer, 'utf8'))

  return Buffer.concat(bodyParts)
}

const formatCurrency = (value: number) => `PKR ${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

export const getSellerBankDetails = (user?: IUser) => {
  if (!user) {
    return {
      accountTitle: 'Seller Account',
      bankName: 'Seller Bank',
      accountNumber: '—'
    }
  }
  const preferredAccount = (user.bankAccounts || []).find(acc => acc.isDefault) || user.bankAccounts?.[0]
  if (preferredAccount) {
    return {
      accountTitle: preferredAccount.accountTitle || user.accountTitle || user.businessName || user.name || 'Seller Account',
      bankName: preferredAccount.bankName || 'Seller Bank',
      accountNumber: preferredAccount.accountNumber || '—'
    }
  }
  return {
    accountTitle: user.accountTitle || user.businessName || user.name || 'Seller Account',
    bankName: 'Seller Bank',
    accountNumber: user.bankAccountNumber || '—'
  }
}

export const generateWithdrawalReceiptPdf = async (withdrawal: IWithdrawal, seller: IUser) => {
  const sellerName = seller.businessName || seller.storeName || `${seller.name} ${seller.lastName || ''}`.trim() || 'Seller'
  const sellerBank = getSellerBankDetails(seller)
  const date = new Date(withdrawal.processedAt || withdrawal.createdAt || new Date())
  const formattedDate = date.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const amountLine = formatCurrency(withdrawal.amount)
  const referenceValue = withdrawal.reference || ((withdrawal as any)?._id?.toString?.() ?? '')

  const lines: PdfLine[] = [
    { text: 'AUTO PARTS PROVIDERS', font: 'bold', size: 26, x: 140 },
    { text: 'Premier Auto Parts Trading', size: 10, x: 200 },
    { text: 'Withdrawal Receipt', font: 'bold', size: 18, x: 150 },
    { text: '═══════════════════════════════════════════════' },
    { text: `Reference #${referenceValue}`, font: 'bold', size: 14 },
    { text: `Status: ${withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}` },
    { text: `Amount Credited: ${amountLine}`, font: 'bold', size: 16 },
    { text: `Processed Date: ${formattedDate}` },
    { text: '' },
    { text: 'Seller Details', font: 'bold', size: 14 },
    { text: `  Name             : ${sellerName}` },
    { text: `  Email            : ${seller.email || '—'}` },
    { text: '' },
    { text: 'Sender Bank Details', font: 'bold', size: 14 },
    { text: `  Account Title    : ${AUTO_PARTS_BANK.accountTitle}` },
    { text: `  Bank Name        : ${AUTO_PARTS_BANK.bankName}` },
    { text: `  Account Number   : ${AUTO_PARTS_BANK.accountNumber}` },
    { text: '' },
    { text: 'Receiver Bank Details', font: 'bold', size: 14 },
    { text: `  Account Title    : ${sellerBank.accountTitle}` },
    { text: `  Bank Name        : ${sellerBank.bankName}` },
    { text: `  Account Number   : ${sellerBank.accountNumber}` },
    { text: '' },
    { text: 'Thank you for banking with Auto Parts Providers.', font: 'bold', size: 12 },
    { text: 'For Complaints & Issues please contact us at info@autopartsprovider.com' },
  ]

  return buildPdfBuffer(lines)
}
