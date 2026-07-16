'use client';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

// Upload de imágenes de productos al bucket compartido en el path
// `toolhome/products/{uid}/{timestamp}-{random}-{filename}`.
//
// El path incluye el uid del admin (auditar quién subió qué) y un
// timestamp+random para evitar colisiones. La storage rule ya
// valida:
//   - solo admin
//   - image/*
//   - < 10MB

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = /^image\//;

export interface UploadedImage {
  url: string;
  path: string;
}

export async function uploadProductImage(
  file: File,
  uid: string
): Promise<UploadedImage> {
  if (!file) throw new Error('No file');
  if (!ACCEPTED.test(file.type)) {
    throw new Error('Only image files are allowed.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error(
      `File too large (${Math.round(file.size / 1024 / 1024)} MB > 10 MB).`
    );
  }
  const rand = Math.random().toString(36).slice(2, 8);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const path = `toolhome/products/${uid}/${Date.now()}-${rand}-${safeName}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(r);
  return { url, path };
}
