

import { supabase } from './supabaseClient';
import { User, Novel, Chapter, Comment } from './types';

// Helper to convert snake_case from Supabase to camelCase for the app
const toCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
            acc[camelKey] = toCamelCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// --- FILE UPLOAD SERVICE --- //
const uploadFile = async (bucket: 'cover_images' | 'profile_pictures', file: File): Promise<string | null> => {
    if (!supabase) return null;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
        console.error('Error uploading file:', error);
        return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
};

// --- DATA SERVICE --- //

export const ApiService = {
  // --- USER/PROFILE METHODS --- //
  async getUsers(): Promise<User[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return toCamelCase(data) as User[];
  },

  async getUser(id: string): Promise<User | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
    return toCamelCase(data) as User;
  },

  async updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    if (!supabase) return null;
    const { username, profilePicture, penName, bio, role } = updatedData;
    const { data, error } = await supabase.from('profiles').update({ 
        username,
        profile_picture: profilePicture,
        pen_name: penName,
        bio,
        role
    }).eq('id', id).select().single();
    if (error) throw error;
    return toCamelCase(data) as User;
  },

  // --- NOVEL METHODS --- //
  async getNovels(): Promise<Novel[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('novels').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (toCamelCase(data) as Novel[]).map(n => ({...n, chapters: []})); // chapters fetched separately
  },

  async getNovel(id: string): Promise<Novel | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('novels').select('*, chapters(*)').eq('id', id).single();
    if (error) throw error;
    if (!data) return undefined;
    
    const novel = toCamelCase(data) as Novel;
    // ensure chapters are sorted
    if(novel.chapters) {
        novel.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }
    return novel;
  },

  async getNovelsByAuthor(authorId: string): Promise<Novel[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('novels').select('*').eq('author_id', authorId).order('created_at', { ascending: false });
    if (error) throw error;
    return (toCamelCase(data) as Novel[]).map(n => ({...n, chapters: []})); // chapters fetched separately
  },

  // --- CHAPTER METHODS --- //
  async getChapterById(id: string): Promise<Chapter | undefined> {
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('chapters').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as Chapter;
  },

  // --- COMMENT METHODS --- //
  async getComments(chapterId: string): Promise<Comment[]> {
    // This is a placeholder as comments table is not in the schema yet.
    return Promise.resolve([]);
  },
  
  // --- BOOKMARK METHODS --- //
  async isNovelBookmarked(userId: string, novelId: string): Promise<boolean> {
      if (!supabase) return false;
      const { data, error } = await supabase.from('bookmarks').select('id').eq('user_id', userId).eq('novel_id', novelId).single();
      return !!data && !error;
  },

  async addBookmark(userId: string, novelId: string): Promise<{ success: boolean }> {
      if (!supabase) return { success: false };
      const { error } = await supabase.from('bookmarks').insert({ user_id: userId, novel_id: novelId });
      return { success: !error };
  },

  async removeBookmark(userId: string, novelId: string): Promise<{ success: boolean }> {
      if (!supabase) return { success: false };
      const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('novel_id', novelId);
      return { success: !error };
  },

  // --- ACTIVITY & INTERACTION METHODS --- //

  async getUserInteractionStatus(novelId: string, userId: string): Promise<{ hasLiked: boolean, userRating: number | null }> {
      if (!supabase) return { hasLiked: false, userRating: null };
      const [likeRes, ratingRes] = await Promise.all([
          supabase.from('likes').select('id').eq('user_id', userId).eq('novel_id', novelId).single(),
          supabase.from('ratings').select('rating').eq('user_id', userId).eq('novel_id', novelId).single()
      ]);

      return {
          hasLiked: !!likeRes.data && !likeRes.error,
          userRating: ratingRes.data?.rating || null
      };
  },

  async likeNovel(userId: string, novelId: string): Promise<{ success: boolean }> {
      if (!supabase) return { success: false };
      const { error } = await supabase.from('likes').insert({ user_id: userId, novel_id: novelId });
      return { success: !error };
  },

  async unlikeNovel(userId: string, novelId: string): Promise<{ success: boolean }> {
      if (!supabase) return { success: false };
      const { error } = await supabase.from('likes').delete().eq('user_id', userId).eq('novel_id', novelId);
      return { success: !error };
  },

  async submitRating(novelId: string, userId: string, rating: number): Promise<{ success: boolean }> {
      if (!supabase) return { success: false };
      const { error } = await supabase.from('ratings').upsert(
          { user_id: userId, novel_id: novelId, rating: rating, updated_at: new Date().toISOString() }, 
          { onConflict: 'user_id, novel_id' }
      );
      return { success: !error };
  },

  // --- UPLOAD METHOD EXPORT --- //
  uploadProfilePicture: (file: File) => uploadFile('profile_pictures', file),
};
