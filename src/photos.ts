/* Photos are resized on the device and kept as data URLs. They are never uploaded. */
export function shrink(file: File, max: number): Promise<string | null> {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const g = c.getContext('2d');
        if (!g) return res(null);
        g.drawImage(img, 0, 0, c.width, c.height);
        try { res(c.toDataURL('image/jpeg', 0.78)); } catch { res(null); }
      };
      img.onerror = () => res(null);
      img.src = fr.result as string;
    };
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });
}
