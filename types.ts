export enum UserRole {
  USER = 'USER',
  AUTHOR = 'AUTHOR',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  profilePicture: string;
  penName?: string;
  bio?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
  };
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
  status: string;
  rating: number;
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

export type ChangelogChangeType = 'NEW' | 'IMPROVED' | 'FIXED';

export interface ChangelogChange {
  type: ChangelogChangeType;
  text: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string; // ISO date string
  changes: ChangelogChange[];
  created_at?: Date;
}
