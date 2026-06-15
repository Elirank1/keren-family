import { describe, expect, it } from 'vitest';
import { createZip, safeName } from '@/lib/zip';

// jsdom's Blob does not implement arrayBuffer(); read via FileReader instead.
function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('zip writer', () => {
  it('produces a valid ZIP local-file-header signature', async () => {
    const blob = createZip([
      { name: 'a.txt', data: new TextEncoder().encode('hello') },
    ]);
    const bytes = await blobToBytes(blob);
    // PK\x03\x04
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
    // End-of-central-directory signature appears at the tail.
    const tail = bytes.slice(bytes.length - 22);
    expect(tail[0]).toBe(0x50);
    expect(tail[1]).toBe(0x4b);
    expect(tail[2]).toBe(0x05);
    expect(tail[3]).toBe(0x06);
  });

  it('sanitizes unsafe filenames', () => {
    expect(safeName('סוס word!@#')).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(safeName('סוס')).toBe('item');
  });
});
