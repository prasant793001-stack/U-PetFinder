// Client-side image privacy: re-encode every photo through a canvas. A canvas export contains ONLY pixels,
// so EXIF, GPS coordinates, camera serials and timestamps are dropped before anything leaves the device.
// We also verify the result and downscale big phone photos (faster uploads, smaller storage).

const MAX_SIDE = 1600;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file is not an image we can read. Try a JPG or PNG.')); };
    img.src = url;
  });
}

async function hasMetadata(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer());
  for (let i = 0; i < bytes.length - 4; i++) {
    // APP1 marker followed by "Exif"
    if (bytes[i] === 0xff && bytes[i + 1] === 0xe1 && bytes[i + 4] === 0x45 && bytes[i + 5] === 0x78) return true;
  }
  return false;
}

export async function stripImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Please choose a photo (JPG, PNG, HEIC exported as JPG...).');
  const hadMeta = await hasMetadata(file).catch(() => false);
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); // browsers apply EXIF orientation here
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
  if (!blob) throw new Error('Could not process this photo. Try another one.');
  const stillHasMeta = await hasMetadata(blob);
  if (stillHasMeta) throw new Error('Privacy check failed - the photo still contains metadata, so it was not used.');
  const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
  return { blob, dataUrl, removedMetadata: hadMeta, width: canvas.width, height: canvas.height, bytes: blob.size, originalBytes: file.size };
}
