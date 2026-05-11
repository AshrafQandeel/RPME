import { getSupabase } from './supabaseClient.js';

const BUCKET_NAME = 'entity-documents';

export interface DocumentRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
  clientId: string;
}

export const ensureBucketExists = async () => {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase configuration missing (VITE_SUPABASE_URL/ANON_KEY)');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    // Check direct access first if listBuckets fails or doesn't show the bucket
    const foundInList = buckets && buckets.some((b: any) => b.name === BUCKET_NAME);

    if (error || !foundInList) {
      console.warn('Bucket name not in list. Checking direct access...');
      const { error: listError } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 1 });
      
      if (!listError) {
        console.log(`Successfully verified access to bucket: ${BUCKET_NAME}`);
        return; // Success!
      }
      
      // If we genuinely couldn't find/access it, throw error or attempt create
      if (error || listError) {
        console.error('Bucket access check failed:', listError || error);
        // Fall through to creation attempt if it was genuinely missing from list and we have no error from listBuckets
      }
    }

    if (!foundInList) {
      // Attempt to create, but warn that browser-side creation is often restricted
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      
      if (createError) {
        throw new Error(
          `Bucket "${BUCKET_NAME}" not found. Please create it manually in the Supabase Dashboard (Storage -> New Bucket), name it "${BUCKET_NAME}", and set it to "Public".`
        );
      }
    }
  } catch (err: any) {
    if (err.message.includes('Bucket') || err.message.includes('inaccessible')) throw err;
    throw new Error(`Storage Connection Failed: ${err.message}`);
  }
};

export const uploadDocument = async (clientId: string, file: File): Promise<DocumentRecord | null> => {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase not initialized (Credentials missing)');

  const fileExt = file.name.split('.').pop();
  const filePath = `${clientId}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, { 
      cacheControl: '3600',
      upsert: false 
    });

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    id: data.path,
    name: file.name,
    size: file.size,
    type: file.type,
    url: publicUrl,
    createdAt: new Date().toISOString(),
    clientId
  };
};

export const listDocuments = async (clientId: string): Promise<DocumentRecord[]> => {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase credentials not configured');

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(clientId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    console.error('Error listing docs:', error);
    return [];
  }

  return data.map((file: any) => {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`${clientId}/${file.name}`);

    return {
      id: `${clientId}/${file.name}`,
      name: file.name,
      size: file.metadata?.size || 0,
      type: file.metadata?.mimetype || 'application/octet-stream',
      url: publicUrl,
      createdAt: file.created_at,
      clientId
    };
  });
};

export const deleteDocument = async (path: string): Promise<boolean> => {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase configuration missing');

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw error;
  }
  return true;
};

export const deleteClientDocuments = async (clientId: string): Promise<void> => {
  const supabase = await getSupabase();
  if (!supabase) return;

  try {
    // 1. List all files in the client's directory
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(clientId);

    if (listError) {
      console.error('Error listing documents for deletion:', listError);
      return;
    }

    if (!files || files.length === 0) return;

    // 2. Map file names to full paths
    const pathsToDelete = files.map((file: any) => `${clientId}/${file.name}`);

    // 3. Delete all files
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(pathsToDelete);

    if (deleteError) {
      console.error('Error deleting client documents:', deleteError);
      throw deleteError;
    }
  } catch (err) {
    console.error('Failed to cleanup client documents:', err);
    // We don't necessarily want to block client deletion if storage cleanup fails,
    // but we log it for audit purposes.
  }
};
