import { supabase } from './supabaseClient';
import { User, Novel, Chapter, Comment, ChangelogEntry, ChangelogChange, UserRole } from './types';

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

export const ApiService = {
  // --- USER METHODS ---
  getUser: async (id: string): Promise<User | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    return toCamelCase(data);
  },

  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('*').order('username');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return toCamelCase(data);
  },

  updateUserRole: async (id: string, updates: { role: UserRole }): Promise<User | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').update({ role: updates.role }).eq('id', id).select().single();
    if (error) {
      console.error('Error updating user role:', error);
      return null;
    }
    return toCamelCase(data);
  },

  updateUserProfile: async (id: string, updates: Partial<User>): Promise<User | null> => {
    if (!supabase) return null;
    const updateData: { [key: string]: any } = {};
    if (updates.penName !== undefined) updateData.pen_name = updates.penName;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.profilePicture !== undefined) updateData.profile_picture = updates.profilePicture;
    if (updates.showBookmarks !== undefined) updateData.show_bookmarks = updates.showBookmarks;
    if (updates.showLikes !== undefined) updateData.show_likes = updates.showLikes;

    if(Object.keys(updateData).length === 0) {
      // If there are no updates to send, just fetch the current user data to return
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      return toCamelCase(data);
    }

    const { data, error } = await supabase.from('profiles').update(updateData).eq('id', id).select().single();
    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
    return toCamelCase(data);
  },

  deleteUserAccount: async (): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    // This assumes an RPC function 'delete_user_account' exists in Supabase
    // which handles deleting the user from auth.users and all related data.
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
        console.error('Error deleting user account:', error);
    }
    return { success: !error };
  },

  uploadProfilePicture: (file: File) => uploadFile('profile_pictures', file),

  // --- NOVEL METHODS ---
  getNovels: async (): Promise<Novel[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('novels')
      .select('*, author:profiles!author_id(username, pen_name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching novels:', error.message, error);
      return [];
    }

    const mappedData = data.map((n: any) => ({
      ...n,
      authorName: n.author ? (n.author.pen_name || n.author.username) : 'Unknown Author',
      chapters: [], // Chapters not needed for list view
      author: undefined,
    }));

    return toCamelCase(mappedData);
  },

  getNovel: async (id: string): Promise<Novel | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('novels')
      .select('*, chapters(*), author:profiles!author_id(username, pen_name)')
      .eq('id', id)
      .order('chapter_number', { referencedTable: 'chapters', ascending: true })
      .single();

    if (error) {
      console.error('Error fetching novel:', error.message, error);
      return null;
    }

    const mappedData = {
      ...data,
      authorName: data.author ? (data.author.pen_name || data.author.username) : 'Unknown Author',
      author: undefined,
    };

    return toCamelCase(mappedData);
  },
  
  getNovelsByAuthor: async (authorId: string): Promise<Novel[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('novels')
      .select('*, author:profiles!author_id(username, pen_name)')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

     if (error) {
      console.error('Error fetching novels by author:', error.message, error);
      return [];
    }

    const mappedData = data.map((n: any) => ({
      ...n,
      authorName: n.author ? (n.author.pen_name || n.author.username) : 'Unknown Author',
      chapters: [], // Chapters not needed for list view
      author: undefined,
    }));
    
    return toCamelCase(mappedData);
  },

  addNovel: async (novelData: Partial<Novel>): Promise<Novel | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase.from('novels').insert({
          title: novelData.title,
          author_id: novelData.authorId,
          cover_image: novelData.coverImage,
          synopsis: novelData.synopsis,
          genre: novelData.genre,
          tags: novelData.tags,
          status: novelData.status,
          language: novelData.language,
      }).select().single();

      if (error) {
          console.error('Error adding novel:', error);
          return null;
      }
      return toCamelCase(data);
  },

  updateNovel: async (id: string, updates: Partial<Novel>): Promise<Novel | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('novels').update({
        title: updates.title,
        synopsis: updates.synopsis,
        genre: updates.genre,
        tags: updates.tags,
        status: updates.status,
        cover_image: updates.coverImage,
    }).eq('id', id).select().single();
     if (error) {
        console.error('Error updating novel:', error);
        return null;
    }
    return toCamelCase(data);
  },

  deleteNovel: async (id: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('novels').delete().eq('id', id);
    if (error) {
      console.error('Error deleting novel:', error);
    }
    return { success: !error };
  },
  
  uploadCoverImage: (file: File) => uploadFile('cover_images', file),

  // --- CHAPTER METHODS ---
  addChapter: async (chapterData: Partial<Chapter>): Promise<Chapter | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('chapters').insert({
        novel_id: chapterData.novelId,
        title: chapterData.title,
        content: chapterData.content,
        chapter_number: chapterData.chapterNumber,
        is_published: chapterData.isPublished,
    }).select().single();
     if (error) {
        console.error('Error adding chapter:', error);
        return null;
    }
    return toCamelCase(data);
  },
  
  updateChapter: async (id: string, updates: Partial<Chapter>): Promise<Chapter | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('chapters').update({
      title: updates.title,
      content: updates.content,
      is_published: updates.isPublished,
    }).eq('id', id).select().single();
     if (error) {
        console.error('Error updating chapter:', error);
        return null;
    }
    return toCamelCase(data);
  },
  
  deleteChapter: async (id: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    return { success: !error };
  },

  // --- INTERACTION METHODS ---
  getBookmarkedNovels: async (userId: string): Promise<Novel[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_novel_bookmarks')
      .select('novels(*, author:profiles!author_id(username, pen_name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarked novels:', error);
      return [];
    }
    const mappedData = data.map((item: any) => ({
        ...(item.novels || {}),
        authorName: item.novels?.author ? (item.novels.author.pen_name || item.novels.author.username) : 'Unknown Author',
        author: undefined,
    }));
    return toCamelCase(mappedData.filter(n => n.id));
  },

  getLikedNovels: async (userId: string): Promise<Novel[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_novel_interactions')
      .select('novels(*, author:profiles!author_id(username, pen_name))')
      .eq('user_id', userId)
      .eq('has_liked', true);

    if (error) {
      console.error('Error fetching liked novels:', error);
      return [];
    }
    const mappedData = data.map((item: any) => ({
        ...(item.novels || {}),
        authorName: item.novels?.author ? (item.novels.author.pen_name || item.novels.author.username) : 'Unknown Author',
        author: undefined,
    }));
    return toCamelCase(mappedData.filter(n => n.id));
  },

  isNovelBookmarked: async (userId: string, novelId: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.from('user_novel_bookmarks').select('novel_id').eq('user_id', userId).eq('novel_id', novelId).maybeSingle();
    if (error) console.error('Error checking bookmark:', error);
    return !!data;
  },

  addBookmark: async (userId: string, novelId: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('user_novel_bookmarks').insert({ user_id: userId, novel_id: novelId });
    return { success: !error };
  },
  
  removeBookmark: async (userId: string, novelId: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('user_novel_bookmarks').delete().match({ user_id: userId, novel_id: novelId });
    return { success: !error };
  },
  
  getUserInteractionStatus: async (novelId: string, userId: string): Promise<{ hasLiked: boolean; userRating: number | null }> => {
    if (!supabase) return { hasLiked: false, userRating: null };
    const { data, error } = await supabase.from('user_novel_interactions').select('has_liked, rating').eq('novel_id', novelId).eq('user_id', userId).maybeSingle();
    if (error) console.error('Error fetching interactions:', error);
    return { hasLiked: data?.has_liked || false, userRating: data?.rating || null };
  },

  likeNovel: async (userId: string, novelId: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.rpc('toggle_like', { p_user_id: userId, p_novel_id: novelId, p_like_status: true });
    return { success: !error };
  },

  unlikeNovel: async (userId: string, novelId: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.rpc('toggle_like', { p_user_id: userId, p_novel_id: novelId, p_like_status: false });
    return { success: !error };
  },

  submitRating: async (novelId: string, userId: string, rating: number): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.rpc('submit_rating', { p_user_id: userId, p_novel_id: novelId, p_rating: rating });
    return { success: !error };
  },

  // --- PROGRESS METHODS ---
  getUserNovelProgress: async (userId: string, novelId: string): Promise<number | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('user_novel_progress')
      .select('last_read_chapter_number')
      .eq('user_id', userId)
      .eq('novel_id', novelId)
      .single();

    if (error || !data) {
      if (error && error.code !== 'PGRST116') { // Ignore "no rows" error, which is expected
          console.error('Error fetching novel progress:', error);
      }
      return null;
    }
    return data.last_read_chapter_number;
  },

  setUserNovelProgress: async (userId: string, novelId: string, chapterNumber: number): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase
      .from('user_novel_progress')
      .upsert({ 
        user_id: userId, 
        novel_id: novelId, 
        last_read_chapter_number: chapterNumber,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, novel_id' });

    if (error) {
        console.error('Error setting novel progress:', error);
    }
    return { success: !error };
  },

  // --- COMMENT METHODS ---
  getComments: async (chapterId: string): Promise<Comment[]> => {
    if (!supabase) return [];
    // This is a simplified fetch; a real implementation would handle nested replies.
    const { data, error } = await supabase.from('comments').select('*, user:profiles(username, profile_picture)').eq('chapter_id', chapterId).is('parent_id', null).order('created_at', { ascending: true });
     if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
    return toCamelCase(data);
  },
  
  // --- CHANGELOG METHODS ---
  getChangelogs: async (): Promise<ChangelogEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('changelogs')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching changelogs:', error);
      return [];
    }
    return toCamelCase(data);
  },

  addChangelog: async (entryData: Omit<ChangelogEntry, 'id' | 'createdAt'>): Promise<ChangelogEntry | null> => {
    if (!supabase) return null;
    const payload = {
      version: entryData.version,
      date: entryData.date,
      changes: entryData.changes,
    };
    const { data, error } = await supabase.from('changelogs').insert(payload).select().single();
     if (error) {
        console.error('Error adding changelog:', error);
        return null;
    }
    return toCamelCase(data);
  },

  updateChangelog: async (id: string, updates: Partial<ChangelogEntry>): Promise<ChangelogEntry | null> => {
    if (!supabase) return null;
    
    const payload: { [key: string]: any } = {};
    if (updates.version !== undefined) payload.version = updates.version;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.changes !== undefined) payload.changes = updates.changes;

    const { data, error } = await supabase.from('changelogs').update(payload).eq('id', id).select().single();
    if (error) {
      console.error('Error updating changelog:', error);
      return null;
    }
    return toCamelCase(data);
  },

  deleteChangelog: async (id: string): Promise<{ success: boolean }> => {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('changelogs').delete().eq('id', id);
    return { success: !error };
  },
};
