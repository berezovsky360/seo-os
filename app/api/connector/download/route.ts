import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Simple ZIP file creation without external dependencies
// Uses the ZIP format spec to create a valid .zip archive

function createZipBuffer(files: Array<{ name: string; data: Buffer }>): Buffer {
  const localFileHeaders: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, 'utf-8')
    const data = file.data

    // CRC-32 calculation
    const crc = crc32(data)

    // Local file header (30 bytes + name + data)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // Local file header signature
    localHeader.writeUInt16LE(20, 4)          // Version needed (2.0)
    localHeader.writeUInt16LE(0, 6)           // General purpose bit flag
    localHeader.writeUInt16LE(0, 8)           // Compression method (stored)
    localHeader.writeUInt16LE(0, 10)          // Last mod file time
    localHeader.writeUInt16LE(0, 12)          // Last mod file date
    localHeader.writeUInt32LE(crc, 14)        // CRC-32
    localHeader.writeUInt32LE(data.length, 18) // Compressed size
    localHeader.writeUInt32LE(data.length, 22) // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26) // File name length
    localHeader.writeUInt16LE(0, 28)           // Extra field length

    const localEntry = Buffer.concat([localHeader, nameBuffer, data])
    localFileHeaders.push(localEntry)

    // Central directory header (46 bytes + name)
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0) // Central directory signature
    centralHeader.writeUInt16LE(20, 4)          // Version made by
    centralHeader.writeUInt16LE(20, 6)          // Version needed
    centralHeader.writeUInt16LE(0, 8)           // General purpose bit flag
    centralHeader.writeUInt16LE(0, 10)          // Compression method (stored)
    centralHeader.writeUInt16LE(0, 12)          // Last mod file time
    centralHeader.writeUInt16LE(0, 14)          // Last mod file date
    centralHeader.writeUInt32LE(crc, 16)        // CRC-32
    centralHeader.writeUInt32LE(data.length, 20) // Compressed size
    centralHeader.writeUInt32LE(data.length, 24) // Uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28) // File name length
    centralHeader.writeUInt16LE(0, 30)           // Extra field length
    centralHeader.writeUInt16LE(0, 32)           // File comment length
    centralHeader.writeUInt16LE(0, 34)           // Disk number start
    centralHeader.writeUInt16LE(0, 36)           // Internal file attributes
    centralHeader.writeUInt32LE(0, 38)           // External file attributes
    centralHeader.writeUInt32LE(offset, 42)      // Relative offset of local header

    centralDirectory.push(Buffer.concat([centralHeader, nameBuffer]))

    offset += localEntry.length
  }

  const centralDirBuffer = Buffer.concat(centralDirectory)
  const centralDirOffset = offset
  const centralDirSize = centralDirBuffer.length

  // End of central directory record (22 bytes)
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0)   // End of central directory signature
  endRecord.writeUInt16LE(0, 4)             // Number of this disk
  endRecord.writeUInt16LE(0, 6)             // Disk where central directory starts
  endRecord.writeUInt16LE(files.length, 8)  // Number of entries on this disk
  endRecord.writeUInt16LE(files.length, 10) // Total number of entries
  endRecord.writeUInt32LE(centralDirSize, 12) // Size of central directory
  endRecord.writeUInt32LE(centralDirOffset, 16) // Offset of central directory
  endRecord.writeUInt16LE(0, 20)             // Comment length

  return Buffer.concat([...localFileHeaders, centralDirBuffer, endRecord])
}

// CRC-32 implementation
function crc32(buf: Buffer): number {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }

  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * GET /api/connector/download
 * Serves the SEO OS Connector WordPress plugin as a .zip file
 */
export async function GET() {
  try {
    const pluginDir = join(process.cwd(), 'wordpress-plugin', 'seo-os-connector')

    const pluginPhp = readFileSync(join(pluginDir, 'seo-os-connector.php'))
    const readmeTxt = readFileSync(join(pluginDir, 'readme.txt'))

    const zipBuffer = createZipBuffer([
      { name: 'seo-os-connector/seo-os-connector.php', data: pluginPhp },
      { name: 'seo-os-connector/readme.txt', data: readmeTxt },
    ])

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="seo-os-connector.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error creating connector zip:', error)
    return NextResponse.json(
      { error: 'Failed to create plugin archive' },
      { status: 500 }
    )
  }
}
