'use client'

import { toQrOptions, type QrDesign } from '@/lib/qr-design'

/**
 * Télécharge un QR sans avoir à l'afficher (vignettes, QR de l'appareil).
 * Même rendu que QrCanvas : options communes tirées de lib/qr-design.
 */
export async function downloadQr(data: string, design: QrDesign, ext: 'png' | 'svg', name: string, size = 1024) {
  const { default: QRCodeStyling } = await import('qr-code-styling')
  const qr = new QRCodeStyling(toQrOptions(design, data, size))
  await qr.download({ extension: ext, name })
}

/** Nom de fichier sûr : « qr-menu-mamiwata ». */
export function qrFileName(label: string): string {
  const base = label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `qr-${base || 'code'}`
}
