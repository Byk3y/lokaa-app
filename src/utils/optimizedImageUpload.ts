import { getSupabaseClient } from '@/integrations/supabase/client';
import { compressImage } from './imageCompression';

export type UploadImageIntent = 'avatar' | 'spaceIcon' | 'spaceCover' | 'postImage' | 'educationalImage';

interface UploadOptimizedImageParams {
  file: File;
  bucket: string;
  path: string;
  intent: UploadImageIntent;
  upsert?: boolean;
  cacheControl?: string;
}

const INTENT_SETTINGS: Record<UploadImageIntent, { maxDimension: number; quality: number }> = {
  avatar: { maxDimension: 768, quality: 0.85 },
  spaceIcon: { maxDimension: 128, quality: 0.9 },
  spaceCover: { maxDimension: 800, quality: 0.7 },
  postImage: { maxDimension: 1920, quality: 0.8 },
  educationalImage: { maxDimension: 1600, quality: 0.82 }
};

const getOutputMimeType = (inputType: string): string => {
  if (inputType === 'image/png' || inputType === 'image/webp' || inputType === 'image/gif') {
    return inputType;
  }
  return 'image/jpeg';
};

export async function uploadOptimizedImage({
  file,
  bucket,
  path,
  intent,
  upsert = false,
  cacheControl = '3600'
}: UploadOptimizedImageParams): Promise<{ publicUrl: string; storagePath: string; originalSize: number; optimizedSize: number }> {
  const { maxDimension, quality } = INTENT_SETTINGS[intent];
  const optimizedBlob = await compressImage(file, maxDimension, quality);
  const outputType = getOutputMimeType(file.type);
  const uploadFile = new File([optimizedBlob], file.name, { type: outputType });

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(bucket).upload(path, uploadFile, {
    cacheControl,
    upsert,
    contentType: outputType
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    storagePath: path,
    originalSize: file.size,
    optimizedSize: optimizedBlob.size
  };
}

