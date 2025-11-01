
export enum UserRole {
  USER = 'USER',
  AUTHOR = 'AUTHOR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  username: string;
  email: string;
  // FIX: Add password field to support case-sensitive login and post-signup flow.
  password?: string; // Made optional for security reasons in real apps, but required in our mock
  role: UserRole;
  profilePicture: string;
  penName?: string;
  bio?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
  };
}

export enum NovelStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
}

export interface Novel {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  coverImage: string;
  synopsis: string;
  genre: string;
  tags: string[];
  status: NovelStatus;
  rating: number;
  views: number;
  likes: number;
  language: string;
  chapters: Chapter[];
  createdAt: Date;
}

export interface Chapter {
  id:string;
  novelId: string;
  title: string;
  content: string;
  chapterNumber: number;
  isPublished: boolean;
  views: number;
  likes: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  chapterId: string;
  content: string;
  createdAt: Date;
  replies?: Comment[];
}
