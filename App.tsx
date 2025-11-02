import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, ComponentPropsWithoutRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, areSupabaseCredentialsSet } from './supabaseClient';
import { User, UserRole, Novel, Chapter, Comment, ChangelogEntry, ChangelogChange, ChangelogChangeType } from './types';
import { ApiService } from './data';
import { GENRES } from './constants';
import { BookOpenIcon, SearchIcon, UserIcon, SunIcon, MoonIcon, ArrowLeftIcon, ArrowRightIcon, BookmarkIcon, StarIcon, HeartIcon, XIcon, PlusIcon, PencilIcon, TrashIcon, BoldIcon, ItalicIcon, UnderlineIcon } from './components/Icons';

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
    addNovelToList: (newNovel: Novel) => void;
    removeNovelFromList: (novelId: string) => void;
}
const NovelsContext = createContext<NovelsContextType | null>(null);

export const useNovels = () => {
    const context = useContext(NovelsContext);
    if (!context) throw new Error("useNovels must be used within a NovelsProvider");
    return context;
};

// FIX: Moved NovelsProvider outside of App component to prevent re-rendering issues and fix context bugs.
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
    
    const addNovelToList = (newNovel: Novel) => {
        setNovels(currentNovels => [newNovel, ...currentNovels]);
    };

    const removeNovelFromList = (novelId: string) => {
        setNovels(currentNovels => currentNovels.filter(n => n.id !== novelId));
    };

    const value = { novels, loading, updateNovelInList, addNovelToList, removeNovelFromList };

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
const TextArea = React.forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'>>(
  (props, ref) => (
    <textarea 
      ref={ref}
      {...props} 
      className={`w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${props.className || ''}`} 
    />
  )
);
const Select = (props: ComponentPropsWithoutRef<'select'>) => <select {...props} className={`w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${props.className || ''}`} />;


const Modal = ({ isOpen, onClose, children, size = 'md' }: { isOpen: boolean, onClose: () => void, children?: ReactNode, size?: 'md' | 'lg' | 'xl' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-light-surface dark:bg-dark-surface rounded-lg shadow-xl p-6 w-full relative ${sizeClasses[size]}`} onClick={e => e.stopPropagation()}>
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
  const [searchQuery, setSearchQuery] = useState('');
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
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };
  
  const isAuthor = user?.role === UserRole.AUTHOR || user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;

  return (
    <header className="bg-light-surface dark:bg-dark-surface shadow-md sticky top-0 z-40">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <BookOpenIcon className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-light-text dark:text-dark-text hidden sm:inline">J Read</span>
            </Link>
            {isAdmin && (
                <Link to="/admin-panel" className="hidden sm:inline-block">
                    <Button variant="secondary" className="!py-1.5 !px-3 text-sm">Admin Panel</Button>
                </Link>
            )}
        </div>
        
        <form onSubmit={handleSearchSubmit} className="w-full max-w-sm relative hidden md:block">
          <input
            type="search"
            placeholder="Search novels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </form>

        <div className="flex items-center space-x-3 flex-shrink-0">
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
                    {isAuthor && (
                        <Link 
                            to="/my-works" 
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            My Works
                        </Link>
                    )}
                    {isAdmin && (
                        <Link 
                            to="/admin-panel" 
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 sm:hidden"
                        >
                            Admin Panel
                        </Link>
                    )}
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
    const [bookmarkedChapter, setBookmarkedChapter] = useState<number | null>(null);
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
                    const [bookmarkStatus, interactionStatus, readingProgress] = await Promise.all([
                        ApiService.isNovelBookmarked(user.id, novelData.id),
                        ApiService.getUserInteractionStatus(novelData.id, user.id),
                        ApiService.getUserNovelProgress(user.id, novelData.id),
                    ]);
                    
                    setIsBookmarked(bookmarkStatus);
                    setHasLiked(interactionStatus.hasLiked);
                    setUserRating(interactionStatus.userRating);
                    setBookmarkedChapter(readingProgress);
                } else {
                    setIsBookmarked(false);
                    setHasLiked(false);
                    setUserRating(null);
                    setBookmarkedChapter(null);
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
    const continueChapterNumber = bookmarkedChapter;
    const readTargetChapterNumber = continueChapterNumber || firstChapter?.chapterNumber;
    const readButtonText = continueChapterNumber ? `Continue Reading (Ch. ${continueChapterNumber})` : 'Read First Chapter';

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
                        {readTargetChapterNumber ? (
                            <Link to={`/read/${novel.id}/${readTargetChapterNumber}`}>
                                <Button className="w-full md:w-auto">{readButtonText}</Button>
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
    const { user, showAuthModal } = useAuth();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [novel, setNovel] = useState<Novel | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    const [fontSize, setFontSize] = useState(16);
    const [bookmarkedChapter, setBookmarkedChapter] = useState<number | null>(null);
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

                            if (user) {
                                const progress = await ApiService.getUserNovelProgress(user.id, novelId);
                                setBookmarkedChapter(progress);
                            } else {
                                setBookmarkedChapter(null);
                            }
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
    }, [novelId, chapterId, user]);
    
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

    const handleBookmark = async () => {
        if (!user) {
            showAuthModal();
            return;
        }
        if (!novelId || !chapter) return;

        setBookmarkedChapter(chapter.chapterNumber); // Optimistic update
        await ApiService.setUserNovelProgress(user.id, novelId, chapter.chapterNumber);
    };

    if (!chapter || !novel) return <div className="text-center py-10">Loading chapter...</div>;

    const isCurrentChapterBookmarked = bookmarkedChapter === currentChapterNumber;

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
            <div className="fixed top-0 left-0 right-0 bg-light-surface dark:bg-dark-surface shadow-md z-30 p-2 px-4 flex justify-between items-center">
                <div className="flex items-center gap-4 flex-grow min-w-0">
                    <Link to={`/novel/${novel.id}`} className="font-bold hover:text-primary truncate">{novel.title}</Link>
                    <span className="text-gray-500">|</span>
                    <span className="truncate max-w-xs">{chapter.title}</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleBookmark} title="Set as Reading Progress" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
                        <BookmarkIcon className="w-6 h-6" filled={isCurrentChapterBookmarked} />
                    </button>
                    <button onClick={() => changeFontSize(-2)} className="text-xs">A-</button>
                    <button onClick={() => changeFontSize(2)} className="text-xl">A+</button>
                    <button onClick={toggleTheme}>{isDarkMode ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}</button>
                </div>
            </div>
            
            <main className="max-w-3xl mx-auto px-4 py-24" style={{ fontSize: `${fontSize}px` }}>
                <h1 className="text-3xl font-bold mb-8 font-serif">{chapter.title}</h1>
                <div 
                    className="prose dark:prose-invert max-w-none font-serif leading-loose whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: chapter.content }}
                />
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
                
                if (user && (user.role === UserRole.AUTHOR || user.role === UserRole.ADMIN || user.role === UserRole.OWNER)) {
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
    
    const isAuthor = profileUser.role === UserRole.AUTHOR || profileUser.role === UserRole.ADMIN || profileUser.role === UserRole.OWNER;

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const formData = new FormData();
        formData.append('email', email);
        formData.append('subject', subject);
        formData.append('message', message);
        
        try {
            const response = await fetch("https://formspree.io/f/mwpwwrgn", {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                setIsSubmitted(true);
            } else {
                const data = await response.json();
                if (data.errors) {
                    setError(data.errors.map((err: any) => err.message).join(', '));
                } else {
                    setError('An unknown error occurred. Please try again.');
                }
            }
        } catch (err) {
            setError('Failed to send message. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
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
                 {error && <p className="text-red-500 text-center mb-4 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-1">Your Email</label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
                        <Input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Feedback on the new reader" required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
                        <TextArea id="message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's on your mind..." required disabled={isSubmitting} />
                    </div>
                    <div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ChangelogFormModal = ({ isOpen, onClose, onSubmit, initialData }: {
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (data: Omit<ChangelogEntry, 'id' | 'createdAt'>) => void,
    initialData?: ChangelogEntry | null
}) => {
    const [version, setVersion] = useState('');
    const [date, setDate] = useState('');
    const [changes, setChanges] = useState<ChangelogChange[]>([{ type: 'NEW', text: '' }]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setVersion(initialData.version);
                // Ensure date is valid before formatting
                const initialDate = new Date(initialData.date);
                setDate(isNaN(initialDate.getTime()) ? '' : initialDate.toISOString().split('T')[0]);
                setChanges(initialData.changes.length > 0 ? initialData.changes : [{ type: 'NEW', text: '' }]);
            } else {
                setVersion('');
                setDate(new Date().toISOString().split('T')[0]);
                setChanges([{ type: 'NEW', text: '' }]);
            }
        }
    }, [initialData, isOpen]);

    const handleChangesChange = (index: number, field: 'type' | 'text', value: string) => {
        const newChanges = [...changes];
        newChanges[index] = { ...newChanges[index], [field]: value };
        setChanges(newChanges);
    };

    const addChange = () => {
        setChanges([...changes, { type: 'NEW', text: '' }]);
    };

    const removeChange = (index: number) => {
        setChanges(changes.filter((_, i) => i !== index));
    };
    
    const handleTriggerSubmit = () => {
        const validChanges = changes.filter(c => c.text.trim() !== '');
        if (version && date && validChanges.length > 0) {
            onSubmit({ version, date, changes: validChanges });
        } else {
            alert("Please fill in version, date, and at least one change description.");
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleTriggerSubmit();
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <h2 className="text-2xl font-bold mb-6">{initialData ? 'Edit Entry' : 'Add New Entry'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="version" className="block text-sm font-medium mb-1">Version</label>
                        <Input id="version" type="text" placeholder="e.g., 1.2.0" value={version} onChange={e => setVersion(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium mb-1">Date</label>
                        <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-2">Changes</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {changes.map((change, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Select value={change.type} onChange={e => handleChangesChange(index, 'type', e.target.value)} className="w-32">
                                    <option value="NEW">NEW</option>
                                    <option value="IMPROVED">IMPROVED</option>
                                    <option value="FIXED">FIXED</option>
                                </Select>
                                <Input type="text" placeholder="Change description..." value={change.text} onChange={e => handleChangesChange(index, 'text', e.target.value)} className="flex-grow" />
                                <Button type="button" variant="danger" onClick={() => removeChange(index)} className="!p-2">
                                    <XIcon className="w-5 h-5"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addChange} className="mt-3 text-sm">Add Change</Button>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleTriggerSubmit}>{initialData ? 'Save Changes' : 'Create Entry'}</Button>
                </div>
            </form>
        </Modal>
    );
};


const ChangelogTag = ({ type }: { type: string }) => {
    const styles: Record<string, string> = {
        NEW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        IMPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        FIXED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return <span className={`inline-block mr-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[type] || 'bg-gray-200 text-gray-800'}`}>{type}</span>;
};


const ChangelogPage = () => {
    const { user } = useAuth();
    const hasAdminPrivileges = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER;
    const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);

    const fetchChangelogs = async () => {
        setIsLoading(true);
        try {
            const data = await ApiService.getChangelogs();
            setChangelogs(data);
        } catch (error) {
            console.error("Failed to fetch changelogs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChangelogs();
    }, []);
    
    const handleFormSubmit = async (data: Omit<ChangelogEntry, 'id' | 'createdAt'>) => {
        const result = editingEntry
            ? await ApiService.updateChangelog(editingEntry.id, data)
            : await ApiService.addChangelog(data);

        setIsModalOpen(false);
        setEditingEntry(null);

        if (result) {
            await fetchChangelogs(); // Re-fetch data from server to guarantee consistency
        } else {
            alert('There was an error saving the changelog entry. Please try again.');
        }
    };

    const openAddModal = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };
    
    const openEditModal = (entry: ChangelogEntry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this changelog entry?')) {
            const { success } = await ApiService.deleteChangelog(id);
            if (success) {
                setChangelogs(changelogs.filter(c => c.id !== id));
            }
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-2">Changelog</h1>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-10">See what's new and improved on J Read.</p>

                {hasAdminPrivileges && (
                    <div className="text-center mb-8">
                        <Button onClick={openAddModal}>Add New Entry</Button>
                    </div>
                )}
                
                {isLoading ? ( <p className="text-center">Loading changelog...</p> ) : (
                    changelogs.map(entry => (
                        <div key={entry.id} className="mb-12">
                            <div className="flex items-baseline justify-between gap-4 mb-4">
                                <div className="flex items-baseline gap-4">
                                    <h2 className="text-2xl font-bold">Version {entry.version}</h2>
                                    <p className="text-gray-500 dark:text-gray-400">{new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                                </div>
                                {hasAdminPrivileges && (
                                    <div className="flex gap-2">
                                        <Button onClick={() => openEditModal(entry)} variant="ghost" className="text-sm !py-1 !px-2">Edit</Button>
                                        <Button onClick={() => handleDelete(entry.id)} variant="danger" className="text-sm !py-1 !px-2">Delete</Button>
                                    </div>
                                )}
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
                    ))
                )}
            </div>
            {hasAdminPrivileges && <ChangelogFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleFormSubmit} initialData={editingEntry} />}
        </div>
    );
}

// --- AUTHORING & SEARCH PAGES --- //

const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const { novels, loading } = useNovels();
    const [filteredNovels, setFilteredNovels] = useState<Novel[]>([]);

    useEffect(() => {
        if (!loading && query) {
            const lowercasedQuery = query.toLowerCase();
            const results = novels.filter(novel => 
                novel.title.toLowerCase().includes(lowercasedQuery) ||
                novel.authorName.toLowerCase().includes(lowercasedQuery) ||
                novel.tags.some(tag => tag.toLowerCase().includes(lowercasedQuery))
            );
            setFilteredNovels(results);
        } else {
            setFilteredNovels([]);
        }
    }, [query, novels, loading]);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-light-text dark:text-dark-text">
                Search Results {query && `for "${query}"`}
            </h1>
            {loading ? (
                 <div className="text-center py-10">Searching...</div>
            ) : filteredNovels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {filteredNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
                </div>
            ) : (
                <p className="text-center py-10 text-gray-500">No novels found matching your search.</p>
            )}
        </div>
    );
};

const MyWorksPage = () => {
    const { user } = useAuth();
    const { removeNovelFromList } = useNovels();
    const navigate = useNavigate();
    const [myNovels, setMyNovels] = useState<Novel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || (user.role !== UserRole.AUTHOR && user.role !== UserRole.ADMIN && user.role !== UserRole.OWNER)) {
            navigate('/');
            return;
        }

        const fetchMyNovels = async () => {
            setIsLoading(true);
            try {
                const novels = await ApiService.getNovelsByAuthor(user.id);
                setMyNovels(novels);
            } catch (error) {
                console.error("Failed to fetch author's novels:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyNovels();
    }, [user, navigate]);
    
    const handleDeleteNovel = async (novelId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this novel and all its chapters? This cannot be undone.')) {
            const { success } = await ApiService.deleteNovel(novelId);
            if (success) {
                setMyNovels(prev => prev.filter(n => n.id !== novelId));
                removeNovelFromList(novelId);
            } else {
                alert('Failed to delete the novel.');
            }
        }
    };

    if (isLoading) return <div className="text-center py-10">Loading your works...</div>;
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">My Works</h1>
                <Link to="/edit-novel">
                    <Button variant="secondary" className="flex items-center gap-2">
                        <PlusIcon className="w-5 h-5"/> New Novel
                    </Button>
                </Link>
            </div>
            {myNovels.length > 0 ? (
                <div className="space-y-4">
                    {myNovels.map(novel => (
                        <div key={novel.id} className="bg-light-surface dark:bg-dark-surface p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <img src={novel.coverImage} alt={novel.title} className="w-16 h-24 object-cover rounded-md flex-shrink-0"/>
                                <div className="flex-grow">
                                    <h2 className="text-xl font-bold">{novel.title}</h2>
                                    <p className="text-sm text-gray-500 capitalize">{novel.status}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Link to={`/manage-chapters/${novel.id}`}>
                                    <Button variant="ghost" className="text-sm">Chapters</Button>
                                </Link>
                                <Link to={`/edit-novel/${novel.id}`}>
                                    <Button variant="ghost" className="!p-2"><PencilIcon className="w-5 h-5"/></Button>
                                </Link>
                                <Button variant="danger" onClick={() => handleDeleteNovel(novel.id)} className="!p-2"><TrashIcon className="w-5 h-5"/></Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-gray-500">You haven't created any novels yet.</p>
                    <Link to="/edit-novel" className="mt-4 inline-block">
                        <Button>Create Your First Novel</Button>
                    </Link>
                </div>
            )}
        </div>
    );
};

const EditNovelPage = () => {
    const { novelId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { updateNovelInList, addNovelToList } = useNovels();
    const [isEditMode, setIsEditMode] = useState(false);
    const [title, setTitle] = useState('');
    const [synopsis, setSynopsis] = useState('');
    const [genre, setGenre] = useState(GENRES[0]);
    const [tags, setTags] = useState('');
    const [status, setStatus] = useState('Draft');
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (novelId) {
            setIsEditMode(true);
            const fetchNovel = async () => {
                const novel = await ApiService.getNovel(novelId);
                if (novel && user && novel.authorId === user.id) {
                    setTitle(novel.title);
                    setSynopsis(novel.synopsis);
                    setGenre(novel.genre);
                    setTags(novel.tags.join(', '));
                    setStatus(novel.status);
                    setCoverImageUrl(novel.coverImage);
                } else {
                    navigate('/my-works'); // Not found or not owner
                }
            };
            fetchNovel();
        }
    }, [novelId, user, navigate]);

    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCoverImageFile(file);
            setCoverImageUrl(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        setError('');

        try {
            let finalCoverImageUrl = coverImageUrl;
            if (coverImageFile) {
                const uploadedUrl = await ApiService.uploadCoverImage(coverImageFile);
                if (!uploadedUrl) throw new Error('Cover image upload failed.');
                finalCoverImageUrl = uploadedUrl;
            }

            if (!finalCoverImageUrl) throw new Error('A cover image is required.');

            const novelData = {
                title,
                synopsis,
                genre,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                status,
                coverImage: finalCoverImageUrl,
                authorId: user.id,
                language: 'English',
            };

            if (isEditMode && novelId) {
                const updatedNovel = await ApiService.updateNovel(novelId, novelData);
                 if (updatedNovel) {
                    updateNovelInList(novelId, updatedNovel);
                 }
            } else {
                const newNovel = await ApiService.addNovel(novelData as any);
                if(newNovel) {
                    // This is a simplified version; real app might need more user details
                    addNovelToList({ ...newNovel, authorName: user.penName || user.username });
                }
            }

            navigate('/my-works');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-6">{isEditMode ? 'Edit Novel' : 'Create New Novel'}</h1>
                {error && <p className="text-red-500 text-center mb-4 bg-red-100 dark:bg-red-900/50 p-3 rounded-md">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-full sm:w-1/3">
                            <label htmlFor="cover-image" className="block text-sm font-medium mb-1">Cover Image</label>
                            <div className="aspect-[512/800] bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center relative overflow-hidden group">
                                {coverImageUrl ? (
                                    <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-500 text-sm p-4 text-center">Click to upload</span>
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-semibold">Change</span>
                                </div>
                                <input id="cover-image" type="file" accept="image/*" onChange={handleCoverImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="w-full sm:w-2/3 space-y-4">
                             <div>
                                <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
                                <Input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div>
                                <label htmlFor="synopsis" className="block text-sm font-medium mb-1">Synopsis</label>
                                <TextArea id="synopsis" rows={6} value={synopsis} onChange={e => setSynopsis(e.target.value)} required />
                            </div>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="genre" className="block text-sm font-medium mb-1">Genre</label>
                        <Select id="genre" value={genre} onChange={e => setGenre(e.target.value)} required>
                            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                        <Input id="tags" type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., magic, dragons, academy" />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                        <Select id="status" value={status} onChange={e => setStatus(e.target.value)} required>
                            <option value="Draft">Draft</option>
                            <option value="Published">Published</option>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => navigate('/my-works')}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Novel'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ManageChaptersPage = () => {
    const { novelId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [novel, setNovel] = useState<Novel | null>(null);

    const fetchNovel = async () => {
        if (novelId) {
            const novelData = await ApiService.getNovel(novelId);
            if (novelData && user && novelData.authorId === user.id) {
                setNovel(novelData);
            } else {
                navigate('/my-works');
            }
        }
    };

    useEffect(() => {
        fetchNovel();
    }, [novelId, user, navigate]);

    const handleDeleteChapter = async (chapterId: string) => {
        if (window.confirm('Are you sure you want to delete this chapter?')) {
            const { success } = await ApiService.deleteChapter(chapterId);
            if (success) {
                fetchNovel();
            } else {
                alert('Failed to delete chapter.');
            }
        }
    };
    
    if (!novel) return <div className="text-center py-10">Loading chapters...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => navigate('/my-works')} className="mb-4 flex items-center gap-2 pl-0">
                    <ArrowLeftIcon className="w-5 h-5"/> Back to My Works
                </Button>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">{novel.title}</h1>
                        <p className="text-gray-500">Manage Chapters</p>
                    </div>
                    <Link to={`/edit-chapter/${novel.id}`}>
                        <Button variant="secondary" className="flex items-center gap-2">
                           <PlusIcon className="w-5 h-5"/> New Chapter
                        </Button>
                    </Link>
                </div>

                <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {novel.chapters.map(chapter => (
                            <li key={chapter.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{chapter.chapterNumber}. {chapter.title} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({chapter.content?.split(/\s+/).filter(Boolean).length || 0} words)</span></p>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chapter.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {chapter.isPublished ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Link to={`/edit-chapter/${novel.id}/${chapter.id}`}>
                                        <Button variant="ghost" className="!p-2"><PencilIcon className="w-5 h-5"/></Button>
                                    </Link>
                                    <Button variant="danger" onClick={() => handleDeleteChapter(chapter.id)} className="!p-2"><TrashIcon className="w-5 h-5"/></Button>
                                </div>
                            </li>
                        ))}
                         {novel.chapters.length === 0 && (
                            <li className="p-8 text-center text-gray-500">This novel has no chapters yet.</li>
                         )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const EditChapterPage = () => {
    const { novelId, chapterId: chapterIdFromParams } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isEditMode, setIsEditMode] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [novel, setNovel] = useState<Novel | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const autoSaveTimeoutRef = useRef<number | null>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setIsEditMode(!!chapterIdFromParams);
        const loadData = async () => {
            if (!novelId || !user) { navigate('/my-works'); return; }
            setIsLoading(true);
            try {
                const novelData = await ApiService.getNovel(novelId);
                if (!novelData || novelData.authorId !== user.id) {
                    navigate('/my-works');
                    return;
                }
                setNovel(novelData);
                if (chapterIdFromParams) {
                    const chapter = novelData.chapters.find(c => c.id === chapterIdFromParams);
                    if (chapter) {
                        setTitle(chapter.title);
                        setContent(chapter.content);
                    } else {
                        navigate(`/manage-chapters/${novelId}`);
                    }
                }
                setSaveStatus('idle');
            } catch (e) {
                console.error("Failed to load data", e);
                navigate('/my-works');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [novelId, chapterIdFromParams, user, navigate]);

    useEffect(() => {
        if (isLoading || saveStatus !== 'dirty') {
            return;
        }

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = window.setTimeout(async () => {
            if (!novelId || !user || !novel) return;

            setSaveStatus('saving');

            try {
                if (chapterIdFromParams) {
                    await ApiService.updateChapter(chapterIdFromParams, { title, content });
                    setSaveStatus('saved');
                } else {
                    const newChapterNumber = (novel.chapters.length > 0 ? Math.max(...novel.chapters.map(c => c.chapterNumber)) : 0) + 1;
                    const newChapter = await ApiService.addChapter({
                        novelId,
                        title: title || "Untitled Draft",
                        content,
                        chapterNumber: newChapterNumber,
                        isPublished: false,
                    });
                    
                    if (newChapter) {
                        setSaveStatus('saved');
                        navigate(`/edit-chapter/${novelId}/${newChapter.id}`, { replace: true });
                    } else {
                        throw new Error("Failed to create new chapter draft.");
                    }
                }
            } catch (error) {
                console.error("Auto-save failed:", error);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('dirty'), 2000); 
            }
        }, 2000);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [title, content, saveStatus, isLoading, novelId, chapterIdFromParams, user, novel, navigate]);

    const handleSubmit = async (publish: boolean) => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        if (!novelId || !user || !novel) return;
        setIsSubmittingManual(true);
        setSaveStatus('saving');
        
        try {
            if (isEditMode && chapterIdFromParams) {
                await ApiService.updateChapter(chapterIdFromParams, { title, content, isPublished: publish });
            } else {
                const newChapterNumber = (novel.chapters.length > 0 ? Math.max(...novel.chapters.map(c => c.chapterNumber)) : 0) + 1;
                await ApiService.addChapter({
                    novelId,
                    title: title || 'Untitled',
                    content,
                    chapterNumber: newChapterNumber,
                    isPublished: publish,
                });
            }
            navigate(`/manage-chapters/${novelId}`);
        } catch (error) {
            console.error("Failed to save chapter:", error);
            setSaveStatus('error');
            alert("Failed to save chapter.");
        } finally {
            setIsSubmittingManual(false);
        }
    };

    const applyFormat = (format: 'bold' | 'italic' | 'underline') => {
        const textarea = contentRef.current;
        if (!textarea) return;

        textarea.focus();

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        if (!selectedText) return;

        const tagMap = {
            bold: 'strong',
            italic: 'em',
            underline: 'u',
        };
        const tag = tagMap[format];
        
        const replacement = `<${tag}>${selectedText}</${tag}>`;
        
        const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        
        setContent(newContent);
        setSaveStatus('dirty');

        requestAnimationFrame(() => {
            if(contentRef.current){
                contentRef.current.focus();
                contentRef.current.setSelectionRange(start, start + replacement.length);
            }
        });
    };
    
    if (isLoading) return <div className="text-center py-10">Loading...</div>;

    const SaveStatusIndicator = () => {
        let text = '';
        if (isSubmittingManual) text = 'Saving...';
        else if (saveStatus === 'saving') text = 'Saving...';
        else if (saveStatus === 'saved') text = 'All changes saved.';
        else if (saveStatus === 'error') text = 'Error saving.';
        else if (saveStatus === 'dirty') text = 'Unsaved changes...';

        return <span className="text-sm text-gray-500 dark:text-gray-400 italic min-h-[1.25rem]">{text}</span>;
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSaveStatus('dirty');
        setTitle(e.target.value);
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSaveStatus('dirty');
        setContent(e.target.value);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => navigate(`/manage-chapters/${novelId}`)} className="mb-4 flex items-center gap-2 pl-0">
                    <ArrowLeftIcon className="w-5 h-5"/> Back to Chapters
                </Button>
                <h1 className="text-3xl font-bold mb-6">{isEditMode ? 'Edit Chapter' : 'New Chapter'}</h1>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="chapter-title" className="block text-sm font-medium mb-1">Title</label>
                        <Input id="chapter-title" type="text" value={title} onChange={handleTitleChange} required />
                    </div>
                    <div>
                        <label htmlFor="chapter-content" className="block text-sm font-medium mb-1">Content</label>
                        <div className="flex items-center gap-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-t-md border border-gray-300 dark:border-gray-600 border-b-0">
                            <button type="button" onClick={() => applyFormat('bold')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Bold">
                                <BoldIcon className="w-5 h-5"/>
                            </button>
                            <button type="button" onClick={() => applyFormat('italic')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Italic">
                                <ItalicIcon className="w-5 h-5"/>
                            </button>
                            <button type="button" onClick={() => applyFormat('underline')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Underline">
                                <UnderlineIcon className="w-5 h-5"/>
                            </button>
                        </div>

                        <TextArea 
                            id="chapter-content" 
                            rows={20} 
                            value={content} 
                            onChange={handleContentChange} 
                            required 
                            className="font-serif !rounded-t-none"
                            ref={contentRef}
                        />
                    </div>
                    <div className="flex justify-end items-center gap-4">
                        <SaveStatusIndicator />
                        <Button variant="ghost" onClick={() => handleSubmit(false)} disabled={isSubmittingManual}>Save as Draft</Button>
                        <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={isSubmittingManual}>
                            {isSubmittingManual ? 'Saving...' : (isEditMode ? 'Update & Publish' : 'Publish')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminPanelPage = () => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.OWNER)) {
            navigate('/');
            return;
        }

        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const allUsers = await ApiService.getUsers();
                setUsers(allUsers);
            } catch (err) {
                setError('Failed to fetch users.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser, navigate]);
    
    const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
        const originalUsers = [...users];
        
        // Optimistic UI update
        setUsers(users.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
        
        const updatedUser = await ApiService.updateUser(targetUserId, { role: newRole });
        if (!updatedUser) {
            alert('Failed to update user role.');
            setUsers(originalUsers); // Revert on failure
        }
    };
    
    const canChangeRole = (targetUser: User): boolean => {
        if (!currentUser) return false;
        if (currentUser.id === targetUser.id) return false; // Cannot change own role

        if (currentUser.role === UserRole.OWNER) {
            return true; // Owner can change anyone except themselves
        }

        if (currentUser.role === UserRole.ADMIN) {
            // Admin cannot change Owner or other Admins
            if (targetUser.role === UserRole.OWNER || targetUser.role === UserRole.ADMIN) {
                return false;
            }
            return true;
        }
        
        return false;
    };

    if (isLoading) return <div className="text-center py-10">Loading users...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Panel - User Management</h1>
            {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-4">{error}</p>}
            <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="p-4 font-semibold">Username</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <td className="p-4">{user.username}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4 capitalize">{user.role.toLowerCase()}</td>
                                <td className="p-4">
                                    <Select 
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                        disabled={!canChangeRole(user)}
                                        className="w-40"
                                    >
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </Select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchResultsPage />} />
      <Route path="/novel/:id" element={<NovelDetailPage />} />
      <Route path="/read/:novelId/:chapterId" element={<ReaderPage />} />
      <Route path="/user/:userId" element={<ProfilePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />

      {/* Authoring Routes */}
      <Route path="/my-works" element={<MyWorksPage />} />
      <Route path="/edit-novel" element={<EditNovelPage />} />
      <Route path="/edit-novel/:novelId" element={<EditNovelPage />} />
      <Route path="/manage-chapters/:novelId" element={<ManageChaptersPage />} />
      <Route path="/edit-chapter/:novelId" element={<EditChapterPage />} />
      <Route path="/edit-chapter/:novelId/:chapterId" element={<EditChapterPage />} />
      
      {/* Admin Route */}
      <Route path="/admin-panel" element={<AdminPanelPage />} />
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
