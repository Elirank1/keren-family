// Convert a Blob to an ArrayBuffer with a FileReader fallback. Blob.arrayBuffer()
// is missing on older iOS Safari (< 14) and in some test environments, so we
// fall back to FileReader, which is universally available.
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(blob);
  });
}
