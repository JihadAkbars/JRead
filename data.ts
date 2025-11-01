import { supabase } from './supabaseClient';
import { User, Novel, Chapter, Comment, UserRole, NovelStatus } from './types';

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
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return toCamelCase(data) as User[];
  },

  async getUser(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
    return toCamelCase(data) as User;
  },

  async updateUser(id: string, updatedData: Partial<User>): Promise<User | null> {
    const { username, profilePicture, penName, bio, role, bookmarksArePublic, activityIsPublic } = updatedData;
    const { data, error } = await supabase.from('profiles').update({ 
        username,
        profile_picture: profilePicture,
        pen_name: penName,
        bio,
        role,
        bookmarks_are_public: bookmarksArePublic,
        activity_is_public: activityIsPublic
    }).eq('id', id).select().single();
    if (error) throw error;
    return toCamelCase(data) as User;
  },

  async deleteSelf(): Promise<{ success: boolean; error?: any }> {
    if (!supabase) return { success: false, error: 'Supabase client not initialized.' };
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
        console.error('Error deleting account via RPC:', error);
        return { success: false, error };
    }
    return { success: true };
  },

  // --- NOVEL METHODS --- //
  async getNovels(): Promise<Novel[]> {
    const { data, error } = await supabase.from('novels').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (toCamelCase(data) as Novel[]).map(n => ({...n, chapters: []})); // chapters fetched separately
  },

  async getNovel(id: string): Promise<Novel | undefined> {
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
  
  async getNovelById(novelId: string): Promise<Novel | null> {
     const { data, error } = await supabase.from('novels').select('*').eq('id', novelId).single();
     if (error) return null;
     return toCamelCase(data) as Novel;
  },

  async getNovelsByAuthor(authorId: string): Promise<Novel[]> {
    const { data, error } = await supabase.from('novels').select('*').eq('author_id', authorId).order('created_at', { ascending: false });
    if (error) throw error;
    return (toCamelCase(data) as Novel[]).map(n => ({...n, chapters: []})); // chapters fetched separately
  },

  async createNovel(author: User, novelData: Partial<Novel>, coverFile?: File): Promise<Novel> {
    let coverImageUrl = novelData.coverImage || `https://picsum.photos/seed/newNovel${Date.now()}/800/500`;
    if (coverFile) {
        const uploadedUrl = await uploadFile('cover_images', coverFile);
        if (uploadedUrl) coverImageUrl = uploadedUrl;
    }

    const { data, error } = await supabase.from('novels').insert({
        title: novelData.title || 'Untitled',
        author_id: author.id,
        author_name: author.penName || author.username,
        cover_image: coverImageUrl,
        synopsis: novelData.synopsis || '',
        genre: novelData.genre || 'Fantasy',
        tags: novelData.tags || [],
        status: novelData.status || NovelStatus.DRAFT,
        language: novelData.language || 'English',
    }).select().single();

    if (error) throw error;
    return {...toCamelCase(data) as Novel, chapters: []};
  },

  async updateNovel(id: string, updatedData: Partial<Novel>, coverFile?: File): Promise<Novel | undefined> {
    let coverImageUrl = updatedData.coverImage;
     if (coverFile) {
        const uploadedUrl = await uploadFile('cover_images', coverFile);
        if (uploadedUrl) coverImageUrl = uploadedUrl;
    }

    const { data, error } = await supabase.from('novels').update({
        title: updatedData.title,
        synopsis: updatedData.synopsis,
        genre: updatedData.genre,
        tags: updatedData.tags,
        language: updatedData.language,
        status: updatedData.status,
        cover_image: coverImageUrl,
    }).eq('id', id).select().single();
    
    if (error) throw error;
    return toCamelCase(data) as Novel;
  },

  async updateNovelStatus(id: string, status: NovelStatus): Promise<Novel | undefined> {
      const { data, error } = await supabase.from('novels').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(data) as Novel;
  },

  async deleteNovel(novelId: string): Promise<{ success: boolean }> {
      const { error } = await supabase.from('novels').delete().eq('id', novelId);
      return { success: !error };
  },

  // --- CHAPTER METHODS --- //
  async getChapterById(id: string): Promise<Chapter | undefined> {
    const { data, error } = await supabase.from('chapters').select('*').eq('id', id).single();
    if (error) return undefined;
    return toCamelCase(data) as Chapter;
  },

  async createChapter(novelId: string, chapterData: { title: string, content: string }, chapterNumber: number): Promise<Chapter | undefined> {
      const { data, error } = await supabase.from('chapters').insert({
          novel_id: novelId,
          title: chapterData.title,
          content: chapterData.content,
          chapter_number: chapterNumber
      }).select().single();
      if (error) throw error;
      return toCamelCase(data) as Chapter;
  },

  async updateChapter(id: string, updatedData: Partial<Chapter>): Promise<Chapter | undefined> {
      const { data, error } = await supabase.from('chapters').update({
          title: updatedData.title,
          content: updatedData.content,
          is_published: updatedData.isPublished,
      }).eq('id', id).select().single();
      if (error) throw error;
      return toCamelCase(data) as Chapter;
  },

  // --- COMMENT METHODS --- //
  async getComments(chapterId: string): Promise<Comment[]> {
    // This is a placeholder as comments table is not in the schema yet.
    return Promise.resolve([]);
  },
  
  // --- BOOKMARK METHODS --- //
  async isNovelBookmarked(userId: string, novelId: string): Promise<boolean> {
      const { data, error } = await supabase.from('bookmarks').select('id').eq('user_id', userId).eq('novel_id', novelId).single();
      return !!data && !error;
  },

  async addBookmark(userId: string, novelId: string): Promise<{ success: boolean }> {
      const { error } = await supabase.from('bookmarks').insert({ user_id: userId, novel_id: novelId });
      return { success: !error };
  },

  async removeBookmark(userId: string, novelId: string): Promise<{ success: boolean }> {
      const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('novel_id', novelId);
      return { success: !error };
  },
  
  async getBookmarkedNovels(userId: string): Promise<Novel[]> {
      const { data, error } = await supabase.from('bookmarks').select('novels(*)').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) {
          console.error('Error fetching bookmarked novels:', error);
          return [];
      }
      return toCamelCase(data.map((item: any) => item.novels).filter(Boolean)) as Novel[];
  },

  // --- ACTIVITY METHODS --- //
  async setLastViewedNovel(userId: string, novelId: string): Promise<void> {
    await supabase.from('profiles').update({ last_viewed_novel_id: novelId }).eq('id', userId);
  },


  // --- UPLOAD METHOD EXPORT --- //
  uploadProfilePicture: (file: File) => uploadFile('profile_pictures', file),
};
