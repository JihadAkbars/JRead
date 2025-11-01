import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, ComponentPropsWithoutRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { supabase, areSupabaseCredentialsSet } from './supabaseClient';
import { User, UserRole, Novel, Chapter, Comment } from './types';
import { ApiService } from './data';
import { GENRES } from './constants';
import { BookOpenIcon, SearchIcon, UserIcon, SunIcon, MoonIcon, ArrowLeftIcon, ArrowRightIcon, BookmarkIcon, StarIcon, HeartIcon, XIcon } from './components/Icons';

// --- AUTH CONTEXT --- //
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (username: string, email: string, pass: string, role: UserRole, penName?: string, bio?: string) => Promise<{ success: boolean; message: string; }>;
  logout: () => void;
  showAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// --- NOVELS CONTEXT --- //
interface NovelsContextType {
    novels: Novel[];
    loading: boolean;
    updateNovelInList: (novelId: string, updatedData: Partial<Novel>) => void;
}
const NovelsContext = createContext<NovelsContextType | null>(null);

export const useNovels = () => {
    const context = useContext(NovelsContext);
    if (!context) throw new Error("useNovels must be used within a NovelsProvider");
    return context;
};

const NovelsProvider = ({ children }: { children: ReactNode }) => {
    const [novels, setNovels] = useState<Novel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNovels = async () => {
            setLoading(true);
            try {
                const data = await ApiService.getNovels();
                setNovels(data);
            } catch (error) {
                console.error("Failed to fetch novels:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNovels();
    }, []);

    const updateNovelInList = (novelId: string, updatedData: Partial<Novel>) => {
        setNovels(currentNovels =>
            currentNovels.map(n =>
                n.id === novelId ? { ...n, ...updatedData } : n
            )
        );
    };

    const value = { novels, loading, updateNovelInList };

    return <NovelsContext.Provider value={value}>{children}</NovelsContext.Provider>;
}


// --- UI HELPER COMPONENTS --- //
type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const Button = ({ children, className = '', variant = 'primary', type = 'button', ...rest }: ButtonProps) => {
  const baseClasses = 'px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-secondary text-white hover:bg-emerald-600 focus:ring-emerald-500',
    ghost: 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  return <button type={type} className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...rest}>{children}</button>;
};

const Input = (props: ComponentPropsWithoutRef<'input'>) => <input {...props} className={`w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${props.className || ''}`} />;
const TextArea = (props: ComponentPropsWithoutRef<'textarea'>) => <textarea {...props} className={`w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${props.className || ''}`} />;

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children?: ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <XIcon className="w-6 h-6" />
        </button>
        {children}
      </div>
    </div>
  );
};

const SupabaseCredentialsWarning = () => (
  <div className="fixed inset-0 bg-red-50 z-[100] flex items-center justify-center p-4 text-center font-sans">
    <div className="bg-white p-8 rounded-lg shadow-2xl max-w-lg border-4 border-red-300">
      <svg className="mx-auto h-12 w-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h1 className="text-3xl font-bold text-red-800 mt-4 mb-2">Configuration Required</h1>
      <p className="text-gray-700 mb-2">
        This application cannot start because it is missing its backend configuration.
      </p>
      <p className="text-gray-600 mb-6">
        Please open the file <code className="bg-red-100 text-red-900 px-2 py-1 rounded font-mono text-sm">supabaseClient.ts</code> and replace the placeholder values with your Supabase Project URL and Anon Key.
      </p>
      <a 
        href="https://supabase.com/dashboard" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="inline-block bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700 transition-colors"
      >
        Get Your Supabase Keys
      </a>
    </div>
  </div>
);

// --- NOVEL CARD COMPONENT --- //
const NovelCard: React.FC<{ novel: Novel }> = ({ novel }) => {
  return (
    <Link to={`/novel/${novel.id}`} className="group block bg-light-surface dark:bg-dark-surface rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
      <div className="relative aspect-[512/800] bg-gray-200 dark:bg-gray-700">
        <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300"></div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-light-text dark:text-dark-text truncate group-hover:text-primary transition-colors">{novel.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{novel.authorName}</p>
        <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-300 gap-3">
          <div className="flex items-center" title="Rating">
            <StarIcon className="w-4 h-4 text-amber-400 mr-1" filled />
            <span>{novel.rating?.toFixed(1) || '0.0'}</span>
          </div>
          <div className="flex items-center" title="Likes">
            <HeartIcon className="w-4 h-4 mr-1 text-red-500" />
            <span>{novel.likes || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- AUTH MODAL COMPONENT --- //
const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [penName, setPenName] = useState('');
  const [bio, setBio] = useState('');
  const auth = useAuth();

  const resetForm = () => {
    setError('');
    setMessage('');
    setUsername('');
    setPassword('');
    setEmail('');
    setRole(UserRole.USER);
    setPenName('');
    setBio('');
  };

  const handleAuthAction = async () => {
    setError('');
    setMessage('');
    if (isLoginView) {
      const success = await auth.login(email, password);
      if (success) {
        handleClose();
      } else {
        setError('Invalid email or password.');
      }
    } else {
      if (!username || !email || !password) {
        setError('Please fill all required fields.');
        return;
      }
      if (!email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (role === UserRole.AUTHOR && !penName) {
        setError('Pen name is required for authors.');
        return;
      }
      const result = await auth.signup(username, email, password, role, penName, bio);
      if (result.success) {
        resetForm();
        setIsLoginView(true);
        setMessage(result.message || 'Account created! Please check your email to verify.');
      } else {
        setError(result.message);
      }
    }
  };
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthAction();
  };
  
  const handleViewSwitch = () => {
    resetForm();
    setIsLoginView(!isLoginView);
  }

  const handleClose = () => {
    resetForm();
    onClose();
  }
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">{isLoginView ? 'Sign In' : 'Sign Up'}</h2>
      </div>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      {message && <p className="text-green-500 text-center mb-4">{message}</p>}
      <form onSubmit={handleFormSubmit}>
        <div className="space-y-4">
          {!isLoginView && (
              <Input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          {!isLoginView && (
              <>
                  <div className="flex gap-4 py-2">
                      <label className="flex items-center cursor-pointer">
                          <input type="radio" name="role" value={UserRole.USER} checked={role === UserRole.USER} onChange={() => setRole(UserRole.USER)} className="form-radio text-primary focus:ring-primary" />
                          <span className="ml-2 text-light-text dark:text-dark-text">Reader</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                          <input type="radio" name="role" value={UserRole.AUTHOR} checked={role === UserRole.AUTHOR} onChange={() => setRole(UserRole.AUTHOR)} className="form-radio text-primary focus:ring-primary" />
                          <span className="ml-2 text-light-text dark:text-dark-text">Author</span>
                      </label>
                  </div>
                   {role === UserRole.AUTHOR && (
                      <>
                          <Input type="text" placeholder="Pen Name*" value={penName} onChange={e => setPenName(e.target.value)} required />
                          <textarea placeholder="Short Bio (optional)" value={bio} onChange={e => setBio(e.target.value)} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24" />
                      </>
                  )}
              </>
          )}
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full">{isLoginView ? 'Sign In' : 'Sign Up'}</Button>
        </div>
      </form>
      <p className="text-center mt-4 text-sm text-light-text dark:text-dark-text">
        {isLoginView ? "Don't have an account? " : "Already have an account? "}
        <button onClick={handleViewSwitch} className="text-primary hover:underline font-semibold">
          {isLoginView ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
    </Modal>
  );
};

// --- HEADER COMPONENT --- //
const Header = () => {
  const { isAuthenticated, user, logout, showAuthModal } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="bg-light-surface dark:bg-dark-surface shadow-md sticky top-0 z-40">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpenIcon className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-light-text dark:text-dark-text">J Read</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
          <div className="block">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <img 
                  src={user.profilePicture} 
                  alt="profile" 
                  className="w-10 h-10 rounded-full cursor-pointer object-cover"
                  onClick={() => setIsProfileDropdownOpen(prev => !prev)}
                />
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-light-surface dark:bg-dark-surface rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                    <Link 
                        to={`/user/${user.id}`} 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Profile
                    </Link>
                    <button 
                        onClick={() => { logout(); setIsProfileDropdownOpen(false); navigate('/'); }} 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={showAuthModal}>Sign In</Button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

// --- FOOTER COMPONENT --- //
const Footer = () => {
  return (
    <footer className="bg-light-surface dark:bg-dark-surface mt-auto py-6">
      <div className="container mx-auto px-4 text-center text-gray-500 dark:text-gray-400">
        <div className="flex justify-center items-center gap-4 mb-2">
          <Link to="/contact" className="hover:text-primary">Contact</Link>
          <Link to="/changelog" className="hover:text-primary">Changelog</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} J Read. All rights reserved.</p>
      </div>
    </footer>
  );
};


// --- PAGES --- //
const HomePage = () => {
  const { novels, loading } = useNovels();
  const [displayNovels, setDisplayNovels] = useState<Novel[]>([]);
  const [activeGenre, setActiveGenre] = useState('All');
  const [sortBy, setSortBy] = useState<'createdAt' | 'rating'>('createdAt');
  
  useEffect(() => {
    let processedNovels = [...novels];

    if (activeGenre !== 'All') {
      processedNovels = processedNovels.filter(n => n.genre === activeGenre);
    }

    processedNovels.sort((a, b) => {
        switch (sortBy) {
            case 'rating': return b.rating - a.rating;
            case 'createdAt':
            default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });
    
    setDisplayNovels(processedNovels);
  }, [novels, activeGenre, sortBy]);

  const sortOptions: Record<typeof sortBy, string> = {
    createdAt: 'Latest Releases',
    rating: 'Top Rated',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Browse by Genre</h2>
              <div>
                  <label htmlFor="sort-by" className="text-sm font-medium mr-2">Sort by:</label>
                  <select 
                    id="sort-by"
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-light-surface dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:ring-primary focus:border-primary"
                  >
                      <option value="createdAt">Latest</option>
                      <option value="rating">Rating</option>
                  </select>
              </div>
          </div>
          <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveGenre('All')} className={`px-4 py-1 rounded-full text-sm transition-colors ${activeGenre === 'All' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text hover:bg-gray-300 dark:hover:bg-gray-600'}`}>All</button>
              {GENRES.map(genre => (
                  <button key={genre} onClick={() => setActiveGenre(genre)} className={`px-4 py-1 rounded-full text-sm transition-colors ${activeGenre === genre ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{genre}</button>
              ))}
          </div>
      </div>

      {loading ? (
        <p className="text-center py-10">Loading novels...</p> 
      ) : (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-light-text dark:text-dark-text">
                {sortOptions[sortBy]} {activeGenre !== 'All' ? ` in ${activeGenre}`: ''}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {displayNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
            </div>
        </div>
      )}
    </div>
  );
};

const InteractiveRating = ({ currentRating, userRating, onRate, disabled }: { currentRating: number, userRating: number | null, onRate: (rating: number) => void, disabled: boolean }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const auth = useAuth();
    const ratingToShow = hoverRating || userRating || 0;

    return (
        <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{userRating ? 'Your Rating' : 'Rate this novel'}</p>
            <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map(star => (
                    <button 
                        key={star}
                        onMouseEnter={() => !disabled && setHoverRating(star)}
                        onClick={() => {
                            if (disabled) return;
                            auth.isAuthenticated ? onRate(star) : auth.showAuthModal()
                        }}
                        className={`text-amber-400 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        aria-label={`Rate ${star} stars`}
                    >
                        <StarIcon className="w-8 h-8" filled={star <= ratingToShow} />
                    </button>
                ))}
                 <div className="ml-3 text-center">
                    <span className="text-3xl font-bold">{currentRating?.toFixed(1) || '0.0'}</span>
                    <span className="text-gray-500">/ 5</span>
                 </div>
            </div>
        </div>
    );
};


const NovelDetailPage = () => {
    const { id } = useParams();
    const { user, showAuthModal } = useAuth();
    const { updateNovelInList } = useNovels();
    const [novel, setNovel] = useState<Novel | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [userRating, setUserRating] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                const novelData = await ApiService.getNovel(id);
    
                if (!novelData) {
                    setNovel(null);
                    return;
                }
    
                setNovel(novelData);
    
                if (user) {
                    const [bookmarkStatus, interactionStatus] = await Promise.all([
                        ApiService.isNovelBookmarked(user.id, novelData.id),
                        ApiService.getUserInteractionStatus(novelData.id, user.id),
                    ]);
                    
                    setIsBookmarked(bookmarkStatus);
                    setHasLiked(interactionStatus.hasLiked);
                    setUserRating(interactionStatus.userRating);
                } else {
                    setIsBookmarked(false);
                    setHasLiked(false);
                    setUserRating(null);
                }
            } catch (error) {
                console.error("Failed to load novel details:", error);
                setNovel(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id, user]);
    
    const handleToggleBookmark = async () => {
        if (!user) { showAuthModal(); return; }
        if (!novel) return;

        const newBookmarkState = !isBookmarked;
        setIsBookmarked(newBookmarkState);
        if (newBookmarkState) {
            await ApiService.addBookmark(user.id, novel.id);
        } else {
            await ApiService.removeBookmark(user.id, novel.id);
        }
    };

    const handleLikeToggle = async () => {
        if (!user) { showAuthModal(); return; }
        if (!novel) return;

        const newLikedState = !hasLiked;
        const newLikesCount = novel.likes + (newLikedState ? 1 : -1);
        
        setHasLiked(newLikedState);
        setNovel(prev => prev ? { ...prev, likes: newLikesCount } : null);
        updateNovelInList(novel.id, { likes: newLikesCount });

        if (newLikedState) {
            await ApiService.likeNovel(user.id, novel.id);
        } else {
            await ApiService.unlikeNovel(user.id, novel.id);
        }
    };

    const handleRatingSubmit = async (rating: number) => {
         if (!user || !novel) return;
         
         const oldUserRating = userRating;
         setUserRating(rating); // Optimistic UI update
         
         const { success } = await ApiService.submitRating(novel.id, user.id, rating);
         if (success) {
            // Refetch novel to get updated average rating from the DB trigger
            const updatedNovel = await ApiService.getNovel(novel.id);
            if (updatedNovel) {
                setNovel(updatedNovel);
                updateNovelInList(novel.id, { rating: updatedNovel.rating });
            }
         } else {
            setUserRating(oldUserRating); // Revert on failure
         }
    };

    if (isLoading) return <div className="text-center py-10">Loading novel...</div>;
    if (!novel) return <div className="text-center py-10">Novel not found.</div>;

    const firstChapter = novel.chapters?.[0];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 flex-shrink-0">
                    <img src={novel.coverImage} alt={novel.title} className="w-full rounded-lg shadow-lg aspect-[512/800] object-cover"/>
                </div>
                <div className="md:w-2/3">
                    <h1 className="text-4xl font-bold text-light-text dark:text-dark-text">{novel.title}</h1>
                    <Link to={`/user/${novel.authorId}`} className="text-lg text-gray-600 dark:text-gray-400 mt-2 hover:text-primary">by {novel.authorName}</Link>
                    
                    <div className="flex items-center gap-6 my-4 text-gray-600 dark:text-gray-400 border-y py-3 border-gray-200 dark:border-gray-700">
                         <div className="text-center">
                            <p className="text-2xl font-bold text-light-text dark:text-dark-text">{novel.likes?.toLocaleString() || 0}</p>
                            <p className="text-sm">Likes</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-light-text dark:text-dark-text">{novel.chapters?.length || 0}</p>
                            <p className="text-sm">Chapters</p>
                        </div>
                    </div>

                    <div className="my-6">
                        <InteractiveRating 
                            currentRating={novel.rating} 
                            userRating={userRating} 
                            onRate={handleRatingSubmit}
                            disabled={!user || user.id === novel.authorId}
                        />
                         {user && user.id === novel.authorId && <p className="text-xs text-gray-500 mt-1">Authors cannot rate their own work.</p>}
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed my-4">{novel.synopsis}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {novel.tags.map(tag => <span key={tag} className="bg-primary/20 text-primary px-3 py-1 text-sm rounded-full">#{tag}</span>)}
                    </div>
                    <div className="flex items-center gap-2">
                        {firstChapter ? (
                            <Link to={`/read/${novel.id}/${firstChapter.chapterNumber}`}>
                                <Button className="w-full md:w-auto">Read First Chapter</Button>
                            </Link>
                        ) : (
                             <Button className="w-full md:w-auto" disabled>No Chapters Available</Button>
                        )}
                        <Button onClick={handleLikeToggle} variant="ghost" className="flex items-center gap-2 !px-3" title={hasLiked ? "Unlike novel" : "Like novel"}>
                            <HeartIcon className={`w-6 h-6 transition-colors ${hasLiked ? 'text-red-500' : ''}`} filled={hasLiked} />
                        </Button>
                         <Button onClick={handleToggleBookmark} variant="ghost" className="flex items-center gap-2 !px-3" title={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}>
                            <BookmarkIcon className={`w-6 h-6 transition-colors ${isBookmarked ? 'text-primary' : ''}`} filled={isBookmarked} />
                        </Button>
                    </div>
                </div>
            </div>
            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-4">Chapters</h2>
                <ul className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
                    {novel.chapters?.map(chapter => (
                        <li key={chapter.id}>
                            <Link to={`/read/${novel.id}/${chapter.chapterNumber}`} className="block px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex justify-between items-center gap-4">
                                    <p className="font-semibold text-light-text dark:text-dark-text flex-grow min-w-0 truncate">
                                        {chapter.chapterNumber}. {chapter.title}
                                    </p>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <ArrowRightIcon className="w-5 h-5 text-gray-400"/>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                     {novel.chapters?.length === 0 && (
                        <li className="px-6 py-4 text-center text-gray-500">No chapters have been published yet.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}

const ReaderPage = () => {
    const { novelId, chapterId } = useParams();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [novel, setNovel] = useState<Novel | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    const [fontSize, setFontSize] = useState(16);
    const navigate = useNavigate();
    const currentChapterNumber = parseInt(chapterId || '1');

    useEffect(() => {
        const loadChapter = async () => {
            if (novelId && chapterId) {
                const chapNum = parseInt(chapterId, 10);
                if (isNaN(chapNum)) return;
                
                try {
                    const novelData = await ApiService.getNovel(novelId);
                    if (novelData) {
                        setNovel(novelData);
                        const currentChap = novelData.chapters.find(c => c.chapterNumber === chapNum);
                        setChapter(currentChap || null);
                        if (currentChap) {
                            const commentsData = await ApiService.getComments(currentChap.id);
                            setComments(commentsData);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load chapter data:", error);
                    setNovel(null);
                    setChapter(null);
                }
            }
        };
        loadChapter();
    }, [novelId, chapterId]);
    
    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

    const changeFontSize = (delta: number) => {
        setFontSize(prev => Math.max(12, Math.min(28, prev + delta)));
    }
    
    const goToChapter = (chapterNumber: number) => {
        if(novel && chapterNumber > 0 && chapterNumber <= novel.chapters.length) {
            navigate(`/read/${novel.id}/${chapterNumber}`);
        }
    }

    if (!chapter || !novel) return <div className="text-center py-10">Loading chapter...</div>;

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
            <div className="fixed top-0 left-0 right-0 bg-light-surface dark:bg-dark-surface shadow-md z-30 p-2 px-4 flex justify-between items-center">
                <div className="flex items-center gap-4 flex-grow min-w-0">
                    <Link to={`/novel/${novel.id}`} className="font-bold hover:text-primary truncate">{novel.title}</Link>
                    <span className="text-gray-500">|</span>
                    <span className="truncate max-w-xs">{chapter.title}</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => changeFontSize(-2)} className="text-xs">A-</button>
                    <button onClick={() => changeFontSize(2)} className="text-xl">A+</button>
                    <button onClick={toggleTheme}>{isDarkMode ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}</button>
                </div>
            </div>
            
            <main className="max-w-3xl mx-auto px-4 py-24" style={{ fontSize: `${fontSize}px` }}>
                <h1 className="text-3xl font-bold mb-8 font-serif">{chapter.title}</h1>
                <div className="prose dark:prose-invert max-w-none font-serif leading-loose whitespace-pre-line">
                    {chapter.content}
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-light-surface dark:bg-dark-surface shadow-inner p-2 px-4 flex justify-between items-center">
                <Button onClick={() => goToChapter(currentChapterNumber - 1)} disabled={currentChapterNumber <= 1} variant="ghost" className="flex items-center gap-2"><ArrowLeftIcon className="w-5 h-5"/> Prev</Button>
                <div className="text-gray-600 dark:text-gray-400">{currentChapterNumber} / {novel.chapters.length}</div>
                <Button onClick={() => goToChapter(currentChapterNumber + 1)} disabled={currentChapterNumber >= novel.chapters.length} variant="ghost" className="flex items-center gap-2">Next <ArrowRightIcon className="w-5 h-5"/></Button>
            </div>
        </div>
    )
};


const ProfilePage = () => {
    const { user: loggedInUser } = useAuth();
    const { userId } = useParams();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [userNovels, setUserNovels] = useState<Novel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            try {
                const user = await ApiService.getUser(userId);
                setProfileUser(user);
                
                if (user && (user.role === UserRole.AUTHOR || user.role === UserRole.ADMIN)) {
                    const novels = await ApiService.getNovelsByAuthor(user.id);
                    // In a real app with proper status fields, you would filter for 'PUBLISHED' status here
                    setUserNovels(novels); 
                }
            } catch (error) {
                console.error("Failed to fetch profile data:", error);
                setProfileUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfileData();
    }, [userId, loggedInUser]);
    
    if (isLoading) return <div className="text-center py-10">Loading profile...</div>;
    if (!profileUser) return <div className="text-center py-10">User not found.</div>;
    
    const isAuthor = profileUser.role === UserRole.AUTHOR || profileUser.role === UserRole.ADMIN;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <img src={profileUser.profilePicture} alt="Profile" className="w-32 h-32 rounded-full ring-4 ring-primary object-cover"/>
                    <div className="flex-grow text-center md:text-left">
                        <h1 className="text-3xl font-bold">{profileUser.username} {profileUser.penName && `(${profileUser.penName})`}</h1>
                        <p className="text-gray-500 dark:text-gray-400">{profileUser.email}</p>
                        <p className="mt-2 text-lg font-semibold text-secondary capitalize">{profileUser.role.toLowerCase()}</p>
                        {profileUser.bio && <p className="mt-4 text-gray-700 dark:text-gray-300">{profileUser.bio}</p>}
                    </div>
                </div>
            </div>

             {isAuthor && (
                 <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4">{`Novels by ${profileUser.penName || profileUser.username}`}</h2>
                     {userNovels.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {userNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
                        </div>
                     ) : (
                        <p className="text-gray-500 dark:text-gray-400">This author hasn't published any novels yet.</p>
                     )}
                </div>
             )}
        </div>
    );
};

const ContactPage = () => {
    const { user } = useAuth();
    const [email, setEmail] = useState(user?.email || '');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would send this data to a server or a service like Formspree.
        // For now, we'll just simulate a successful submission.
        console.log({ email, subject, message });
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <div className="bg-light-surface dark:bg-dark-surface max-w-lg mx-auto p-8 rounded-lg shadow-md">
                    <h1 className="text-3xl font-bold text-secondary mb-4">Thank You!</h1>
                    <p>Your message has been received. We appreciate your feedback and will get back to you if necessary.</p>
                    <Link to="/">
                        <Button className="mt-6">Back to Home</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-2 text-center">Contact Us</h1>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Have a question, feedback, or a bug to report? Let us know!</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">Your Email</label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
                        <Input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Feedback on the new reader" required />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                        <TextArea id="message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's on your mind..." required />
                    </div>
                    <div>
                        <Button type="submit" className="w-full">Submit Feedback</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const changelogData = [
    {
        version: '1.0.0',
        date: 'July 28, 2024',
        changes: [
            { type: 'NEW', text: 'Initial launch of J Read! Welcome to the platform.' },
            { type: 'NEW', text: 'User accounts: Readers and Authors can sign up and log in.' },
            { type: 'NEW', text: 'Browse novels by genre and sort by latest or top-rated.' },
            { type: 'NEW', 'text': 'Interactive novel reader with adjustable font size and dark/light modes.' },
            { type: 'NEW', 'text': 'Novel detail pages with synopsis, chapters, and author information.' },
            { type: 'NEW', 'text': 'Users can like, rate, and bookmark novels.' },
            { type: 'NEW', 'text': 'Author profile pages to showcase their works.' },
        ],
    },
    {
        version: '1.1.0',
        date: 'July 29, 2024',
        changes: [
            { type: 'NEW', text: 'Added a Contact page for user feedback.' },
            { type: 'NEW', text: 'Added this Changelog page to keep you updated!' },
            { type: 'IMPROVED', text: 'Optimized novel loading performance on the homepage.' },
            { type: 'FIXED', text: 'Resolved a bug where the profile dropdown would sometimes not close correctly.' },
        ]
    }
];

const ChangelogTag = ({ type }: { type: string }) => {
    const styles: Record<string, string> = {
        NEW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        IMPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        FIXED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return <span className={`inline-block mr-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[type] || 'bg-gray-200 text-gray-800'}`}>{type}</span>;
};


const ChangelogPage = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-2">Changelog</h1>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-10">See what's new and improved on J Read.</p>
                
                {changelogData.map(entry => (
                    <div key={entry.version} className="mb-12">
                        <div className="flex items-baseline gap-4 mb-4">
                            <h2 className="text-2xl font-bold">Version {entry.version}</h2>
                            <p className="text-gray-500 dark:text-gray-400">{entry.date}</p>
                        </div>
                        <ul className="space-y-3 list-inside bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md">
                            {entry.changes.map((change, index) => (
                                <li key={index} className="flex items-start">
                                    <ChangelogTag type={change.type} />
                                    <span>{change.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}


const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/novel/:id" element={<NovelDetailPage />} />
      <Route path="/read/:novelId/:chapterId" element={<ReaderPage />} />
      <Route path="/user/:userId" element={<ProfilePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
    </Routes>
  );
};


// --- APP COMPONENT --- //
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(false);
      setIsAuthenticated(!!session);

      if (session?.user) {
        ApiService.getUser(session.user.id)
          .then((profile) => {
            if (profile) {
              setUser(profile);
            } else {
              console.warn("No profile found for authenticated user. Logging out.");
              supabase.auth.signOut();
            }
          })
          .catch((error) => {
            console.error("Error fetching user profile:", error);
            supabase.auth.signOut();
          });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return !error;
  };
  
  const signup = async (username: string, email: string, pass: string, role: UserRole, penName?: string, bio?: string): Promise<{ success: boolean; message: string; }> => {
    if (!supabase) return { success: false, message: 'Database client not initialized.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          username,
          role,
          pen_name: penName || '',
          bio: bio || '',
          profile_picture: `https://picsum.photos/seed/newUser${Date.now()}/100/100`,
        }
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }
    
    if (data.user) {
        return { success: true, message: data.session ? 'Signup successful!' : 'Signup successful! Please check your email for a verification link.' };
    }
    
    return { success: false, message: 'An unknown error occurred during sign up.' };
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  const authContextValue = {
    user,
    isAuthenticated,
    login,
    signup,
    logout,
    showAuthModal: () => setIsAuthModalOpen(true),
  };
  
  if (!areSupabaseCredentialsSet) {
    return <SupabaseCredentialsWarning />;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">Loading...</div>;
  }
  
  return (
    <AuthContext.Provider value={authContextValue}>
      <NovelsProvider>
        <HashRouter>
          <div className="flex flex-col min-h-screen font-sans text-light-text dark:text-dark-text">
            <Header />
            <main className="flex-grow">
              <AppRouter />
            </main>
            <Footer />
          </div>
          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </HashRouter>
      </NovelsProvider>
    </AuthContext.Provider>
  );
};

export default App;
