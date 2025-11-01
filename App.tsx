import React, { useState, useEffect, createContext, useContext, ReactNode, useRef, ComponentPropsWithoutRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { supabase, areSupabaseCredentialsSet } from './supabaseClient';
import { User, UserRole, Novel, Chapter, Comment, NovelStatus } from './types';
import { ApiService } from './data';
import { GENRES } from './constants';
import { BookOpenIcon, SearchIcon, UserIcon, SunIcon, MoonIcon, ArrowLeftIcon, ArrowRightIcon, BookmarkIcon, StarIcon, XIcon, MenuIcon, TrashIcon, EditIcon, PlusIcon, EyeIcon, EyeOffIcon, UploadIcon } from './components/Icons';

// --- AUTH CONTEXT --- //
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isUpdating: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (username: string, email: string, pass: string, role: UserRole, penName?: string, bio?: string) => Promise<{ success: boolean; message: string; }>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>, profilePicFile?: File) => Promise<{success: boolean, message?: string}>;
  deleteAccount: () => Promise<{success: boolean, message?: string}>;
  showAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

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
      <div className="relative">
        <img src={novel.coverImage} alt={novel.title} className="w-full h-64 object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300"></div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-light-text dark:text-dark-text truncate group-hover:text-primary transition-colors">{novel.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{novel.authorName}</p>
        <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-300">
          <StarIcon className="w-4 h-4 text-amber-400 mr-1" filled />
          <span>{novel.rating}</span>
          <span className="mx-2">•</span>
          <span>{novel.genre}</span>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Novel[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, searchRef]);


  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };
  
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 1) {
        // In a real app, you'd debounce this call.
        // For now, we'll fetch on every change.
        const novels = await ApiService.getNovels();
        const lowerCaseQuery = query.toLowerCase();
        const filteredNovels = novels.filter(novel => 
            novel.title.toLowerCase().includes(lowerCaseQuery) ||
            novel.authorName.toLowerCase().includes(lowerCaseQuery)
        );
        setSearchSuggestions(filteredNovels.slice(0, 7));
    } else {
        setSearchSuggestions([]);
    }
  };

  const handleSuggestionClick = (item: Novel) => {
    setSearchQuery('');
    setSearchSuggestions([]);
    navigate(`/novel/${item.id}`);
  };


  const navLinks = [
    { name: 'Home', path: '/' },
    ...((user?.role === UserRole.AUTHOR || user?.role === UserRole.ADMIN) ? [{ name: 'Dashboard', path: '/dashboard' }] : []),
    ...(user?.role === UserRole.ADMIN ? [{ name: 'Admin', path: '/admin' }] : []),
    ...(isAuthenticated ? [{ name: 'Profile', path: `/user/${user?.id}` }] : []),
  ];

  return (
    <header className="bg-light-surface dark:bg-dark-surface shadow-md sticky top-0 z-40">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpenIcon className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-light-text dark:text-dark-text">J Read</span>
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          <div className="relative" ref={searchRef}>
            <Input 
                type="text" 
                placeholder="Search novels or authors..." 
                className="pl-10 !w-72" 
                value={searchQuery}
                onChange={handleSearchChange}
                autoComplete="off"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-light-surface dark:bg-dark-surface rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {searchSuggestions.map(item => (
                        <li 
                            key={item.id} 
                            className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3"
                            onClick={() => handleSuggestionClick(item)}
                        >
                           <img src={item.coverImage} alt={item.title} className="w-8 h-12 object-cover rounded flex-shrink-0"/>
                           <div>
                               <p className="font-semibold text-sm truncate text-light-text dark:text-dark-text">{item.title}</p>
                               <p className="text-xs text-gray-500 dark:text-gray-400">by {item.authorName}</p>
                           </div>
                        </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          {navLinks.map(link => <Link key={link.name} to={link.path} className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">{link.name}</Link>)}
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
          <div className="hidden md:block">
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
                    <Link 
                        to="/bookmarks" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        My Bookmarks
                    </Link>
                    <Link 
                        to="/settings" 
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Settings
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
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MenuIcon className="w-6 h-6 text-light-text dark:text-dark-text" />
          </button>
        </div>
      </nav>
      {isMenuOpen && (
         <div className="md:hidden bg-light-surface dark:bg-dark-surface py-2">
             {navLinks.map(link => <Link key={link.name} to={link.path} onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary">{link.name}</Link>)}
             {!isAuthenticated && <div className="px-4 py-2"><Button onClick={() => { showAuthModal(); setIsMenuOpen(false); }} className="w-full">Sign In</Button></div>}
             {isAuthenticated && <button onClick={() => { logout(); setIsMenuOpen(false); navigate('/'); }} className="block w-full text-left px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary">Logout</button>}
        </div>
      )}
    </header>
  );
};

// --- PAGES --- //
const HomePage = () => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [displayNovels, setDisplayNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState('All');
  const [sortBy, setSortBy] = useState<'createdAt' | 'views' | 'rating'>('createdAt');

  useEffect(() => {
    const fetchNovels = async () => {
      setLoading(true);
      const data = await ApiService.getNovels();
      setNovels(data);
      setLoading(false);
    };
    fetchNovels();
  }, []);
  
  useEffect(() => {
    let processedNovels = [...novels];

    if (activeGenre !== 'All') {
      processedNovels = processedNovels.filter(n => n.genre === activeGenre);
    }

    processedNovels.sort((a, b) => {
        switch (sortBy) {
            case 'views': return b.views - a.views;
            case 'rating': return b.rating - a.rating;
            case 'createdAt':
            default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });
    
    setDisplayNovels(processedNovels);
  }, [novels, activeGenre, sortBy]);

  const sortOptions: Record<typeof sortBy, string> = {
    createdAt: 'Latest Releases',
    views: 'Popular Novels',
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
                      <option value="views">Popularity</option>
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


const NovelDetailPage = () => {
    const { id } = useParams();
    const { user, showAuthModal } = useAuth();
    const [novel, setNovel] = useState<Novel | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if(!id) return;
        
        setIsLoading(true);
        ApiService.getNovel(id).then(data => {
            setNovel(data || null)
            
            if (user && data) {
                ApiService.isNovelBookmarked(user.id, data.id).then(setIsBookmarked);
                ApiService.setLastViewedNovel(user.id, data.id); // fire-and-forget
            }
        }).finally(() => setIsLoading(false));

    }, [id, user]);
    
    const handleToggleBookmark = async () => {
        if (!user) {
            showAuthModal();
            return;
        }
        if (!novel) return;

        if (isBookmarked) {
            await ApiService.removeBookmark(user.id, novel.id);
        } else {
            await ApiService.addBookmark(user.id, novel.id);
        }
        setIsBookmarked(!isBookmarked);
    };

    if (isLoading) return <div className="text-center py-10">Loading novel...</div>;
    if (!novel) return <div className="text-center py-10">Novel not found.</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 flex-shrink-0">
                    <img src={novel.coverImage} alt={novel.title} className="w-full rounded-lg shadow-lg"/>
                </div>
                <div className="md:w-2/3">
                    <h1 className="text-4xl font-bold text-light-text dark:text-dark-text">{novel.title}</h1>
                    <Link to={`/user/${novel.authorId}`} className="text-lg text-gray-600 dark:text-gray-400 mt-2 hover:text-primary">by {novel.authorName}</Link>
                    <div className="flex items-center gap-4 my-4">
                        <div className="flex items-center text-lg"><StarIcon className="w-5 h-5 text-amber-400 mr-2" filled/> {novel.rating}</div>
                        <div className="text-gray-500">{novel.views.toLocaleString()} Views</div>
                        <div className="text-gray-500">{novel.likes.toLocaleString()} Likes</div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed my-4">{novel.synopsis}</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {novel.tags.map(tag => <span key={tag} className="bg-primary/20 text-primary px-3 py-1 text-sm rounded-full">#{tag}</span>)}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={`/read/${novel.id}/1`}>
                            <Button className="w-full md:w-auto">Read First Chapter</Button>
                        </Link>
                         <Button onClick={handleToggleBookmark} variant="ghost" className="flex items-center gap-2 !px-3" title={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}>
                            <BookmarkIcon className={`w-6 h-6 ${isBookmarked ? 'text-primary' : ''}`} filled={isBookmarked} />
                            <span className="hidden md:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
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
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-light-text dark:text-dark-text">{chapter.title}</p>
                                    <ArrowRightIcon className="w-5 h-5 text-gray-400"/>
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
    const [isChapterMenuOpen, setIsChapterMenuOpen] = useState(false);
    const chapterMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (novelId && chapterId) {
            window.scrollTo(0, 0);
            const chapNum = parseInt(chapterId, 10);

            // Reset state for navigation
            setNovel(null);
            setChapter(null);
            setComments([]);

            if (isNaN(chapNum)) return;
            
            ApiService.getNovel(novelId).then(novelData => {
              if (novelData) {
                setNovel(novelData);
                const currentChap = novelData.chapters.find(c => c.chapterNumber === chapNum);
                setChapter(currentChap || null);
                if (currentChap) {
                  ApiService.getComments(currentChap.id).then(setComments);
                }
              }
            });
        }
    }, [novelId, chapterId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (chapterMenuRef.current && !chapterMenuRef.current.contains(event.target as Node)) {
            setIsChapterMenuOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [chapterMenuRef]);
    
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
                    <div className="relative" ref={chapterMenuRef}>
                        <button onClick={() => setIsChapterMenuOpen(prev => !prev)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                            <span className="truncate max-w-xs">{chapter.title}</span>
                            <MenuIcon className="w-5 h-5 flex-shrink-0" />
                        </button>
                        {isChapterMenuOpen && (
                            <div className="absolute top-full mt-2 w-72 bg-light-surface dark:bg-dark-surface rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {novel.chapters.map(chap => (
                                        <li key={chap.id}>
                                            <Link 
                                                to={`/read/${novel.id}/${chap.chapterNumber}`}
                                                onClick={() => setIsChapterMenuOpen(false)}
                                                className={`block w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 ${chap.chapterNumber === currentChapterNumber ? 'font-bold text-primary' : ''}`}
                                            >
                                                <p className="truncate">{chap.chapterNumber}. {chap.title}</p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => changeFontSize(-2)} className="text-xs">A-</button>
                    <button onClick={() => changeFontSize(2)} className="text-xl">A+</button>
                    <button onClick={toggleTheme}>{isDarkMode ? <SunIcon className="w-5 h-5"/> : <MoonIcon className="w-5 h-5"/>}</button>
                    <button><BookmarkIcon className="w-5 h-5"/></button>
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

const EditUserRoleModal = ({ user, isOpen, onClose, onUserUpdated }: { user: User, isOpen: boolean, onClose: () => void, onUserUpdated: (user: User) => void }) => {
    const [role, setRole] = useState<UserRole>(user.role);

    const handleSubmit = async () => {
        const updatedUser = await ApiService.updateUser(user.id, { role });
        if (updatedUser) {
            onUserUpdated(updatedUser);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Edit Role for {user.username}</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User Role</label>
                    <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button onClick={onClose} variant="ghost">Cancel</Button>
                    <Button onClick={handleSubmit}>Save Changes</Button>
                </div>
            </div>
        </Modal>
    );
};

const AdminLoginPage = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const auth = useAuth();
    
    const handleLogin = async () => {
        setError('');
        const success = await auth.login(email, password);
        if (success) {
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const profile = await ApiService.getUser(user.id);
                if (profile?.role === UserRole.ADMIN) {
                    onLoginSuccess();
                } else {
                    setError('You do not have admin privileges.');
                    auth.logout();
                }
            }
        } else {
            setError('Invalid admin credentials.');
        }
    }

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin();
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm p-8 bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-center mb-6 text-light-text dark:text-dark-text">Admin Login</h1>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleFormSubmit}>
                    <div className="space-y-4">
                        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                        <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                        <Button type="submit" className="w-full">Login</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [novels, setNovels] = useState<Novel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const usersData = await ApiService.getUsers();
        const novelsData = await ApiService.getNovels();
        setUsers(usersData);
        setNovels(novelsData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleDeleteUser = async (userId: string, username: string) => {
        // This is a simplified client-side delete. In a real app, this should be a secure backend function.
        if (window.confirm(`Are you sure you want to delete user "${username}"? This will also delete all their novels and chapters.`)) {
            // Can't delete users from client-side with RLS for security.
            // This would require an admin client or a server-side function.
            alert("User deletion from client is disabled for security. Please manage users in the Supabase dashboard.");
        }
    };
    
    const handleDeleteNovel = async (novelId: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete the novel "${title}"?`)) {
            await ApiService.deleteNovel(novelId);
            setNovels(prev => prev.filter(n => n.id !== novelId));
        }
    };
    
    const handleUpdateUser = (updatedUser: User) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setEditingUser(null);
    };

    if (isLoading) return <div className="text-center py-10">Loading admin data...</div>;

    return (
        <>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Manage Users ({users.length})</h2>
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md max-h-[60vh] overflow-y-auto">
                            {users.map(user => (
                                <div key={user.id} className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="font-semibold">{user.username} ({user.role})</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" onClick={() => setEditingUser(user)} title="Edit User Role"><EditIcon className="w-5 h-5"/></Button>
                                        {user.role !== UserRole.ADMIN && (
                                           <Button variant="ghost" onClick={() => handleDeleteUser(user.id, user.username)} title="Delete User"><TrashIcon className="w-5 h-5 text-red-500"/></Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Manage Novels ({novels.length})</h2>
                        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md max-h-[60vh] overflow-y-auto">
                             {novels.map(novel => (
                                <div key={novel.id} className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="font-semibold truncate max-w-xs">{novel.title}</p>
                                        <p className="text-sm text-gray-500">by {novel.authorName}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => handleDeleteNovel(novel.id, novel.title)} title="Delete Novel"><TrashIcon className="w-5 h-5 text-red-500"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {editingUser && (
                <EditUserRoleModal 
                    user={editingUser} 
                    isOpen={!!editingUser} 
                    onClose={() => setEditingUser(null)} 
                    onUserUpdated={handleUpdateUser}
                />
            )}
        </>
    );
}

const AdminPage = () => {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(user?.role === UserRole.ADMIN);

    useEffect(() => {
        setIsAdmin(user?.role === UserRole.ADMIN);
    }, [user]);

    if (!isAdmin) {
        return <AdminLoginPage onLoginSuccess={() => setIsAdmin(true)} />;
    }

    return <AdminDashboard />;
};

const EditProfileModal = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: User }) => {
    const auth = useAuth();
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(user.profilePicture);
    const [penName, setPenName] = useState(user.penName || '');
    const [bio, setBio] = useState(user.bio || '');
    const [showCamera, setShowCamera] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanupCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const handleClose = () => {
        cleanupCamera();
        setShowCamera(false);
        onClose();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setProfilePicFile(file);
            setProfilePicPreview(URL.createObjectURL(file));
        }
    };

    const handleOpenCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera: ", err);
            setShowCamera(false);
        }
    };

    const handleTakePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
                    setProfilePicFile(file);
                    setProfilePicPreview(URL.createObjectURL(file));
                }
            }, 'image/jpeg');
            setShowCamera(false);
            cleanupCamera();
        }
    };

    const handleSubmit = async () => {
        await auth.updateUser({
            penName: user.role === UserRole.AUTHOR ? penName : user.penName,
            bio,
        }, profilePicFile || undefined);
        handleClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {showCamera ? (
                <div>
                     <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Take Photo</h2>
                     <video ref={videoRef} autoPlay playsInline className="w-full rounded-md bg-gray-900"></video>
                     <canvas ref={canvasRef} className="hidden"></canvas>
                     <div className="flex justify-center gap-2 pt-4">
                         <Button onClick={() => {setShowCamera(false); cleanupCamera()}} variant="ghost">Cancel</Button>
                         <Button onClick={handleTakePhoto}>Take Photo</Button>
                     </div>
                </div>
            ) : (
                <>
                    <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Edit Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Picture</label>
                            <div className="mt-2 flex items-center gap-4">
                                <img src={profilePicPreview || user.profilePicture} alt="Profile preview" className="w-20 h-20 rounded-full object-cover"/>
                                <div className="flex flex-col gap-2">
                                    <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>Upload Image</Button>
                                    <Button variant="ghost" onClick={handleOpenCamera}>Use Camera</Button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                                </div>
                            </div>
                        </div>

                        {user.role === UserRole.AUTHOR && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pen Name</label>
                                <Input type="text" value={penName} onChange={e => setPenName(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button onClick={handleClose} variant="ghost">Cancel</Button>
                            <Button onClick={handleSubmit}>Save Changes</Button>
                        </div>
                    </div>
                </>
            )}
        </Modal>
    );
};

const BecomeAuthorModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (penName: string) => void }) => {
    const [penName, setPenName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!penName.trim()) {
            setError('Pen name is required.');
            return;
        }
        setError('');
        onSubmit(penName);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Become an Author</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Choose a pen name to start writing your own novels!</p>
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pen Name</label>
                    <Input type="text" value={penName} onChange={e => setPenName(e.target.value)} placeholder="Your author name" required />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button onClick={onClose} variant="ghost">Cancel</Button>
                    <Button onClick={handleSubmit}>Start Writing</Button>
                </div>
            </div>
        </Modal>
    );
};


const ProfilePage = () => {
    const { user: loggedInUser, isUpdating, updateUser } = useAuth();
    const { userId } = useParams();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [userNovels, setUserNovels] = useState<Novel[]>([]);
    const [bookmarkedNovels, setBookmarkedNovels] = useState<Novel[]>([]);
    const [lastViewedNovel, setLastViewedNovel] = useState<Novel | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBecomeAuthorModalOpen, setIsBecomeAuthorModalOpen] = useState(false);
    
    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setProfileUser(null);
            setUserNovels([]);
            setBookmarkedNovels([]);
            setLastViewedNovel(null);

            try {
                const user = await ApiService.getUser(userId);
                setProfileUser(user);
                
                if (!user) return;
                
                const isOwnProfile = loggedInUser?.id === user.id;

                if (user.role === UserRole.AUTHOR || user.role === UserRole.ADMIN) {
                    const novels = await ApiService.getNovelsByAuthor(user.id);
                    setUserNovels(novels.filter(n => isOwnProfile || n.status === NovelStatus.PUBLISHED));
                }
                
                if (isOwnProfile || user.activityIsPublic) {
                    if (user.lastViewedNovelId) {
                        ApiService.getNovelById(user.lastViewedNovelId).then(setLastViewedNovel);
                    }
                }

                if (isOwnProfile || user.bookmarksArePublic) {
                    ApiService.getBookmarkedNovels(user.id).then(setBookmarkedNovels);
                }

            } catch (error) {
                console.error("Failed to fetch profile data:", error);
                setProfileUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfileData();
    }, [userId, loggedInUser, isUpdating]);
    
    const isOwnProfile = loggedInUser?.id === profileUser?.id;

    const handleBecomeAuthor = async (penName: string) => {
        if (!loggedInUser) return;
        await updateUser({
            role: UserRole.AUTHOR,
            penName: penName,
        });
        setIsBecomeAuthorModalOpen(false);
    };

    if (isLoading || isUpdating) return <div className="text-center py-10">Loading profile...</div>;
    if (!profileUser) return <div className="text-center py-10">User not found.</div>;
    
    const showBookmarks = isOwnProfile || profileUser.bookmarksArePublic;
    const showActivity = isOwnProfile || profileUser.activityIsPublic;

    return (
        <>
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
                        <div className="flex items-center self-center md:self-start mt-4 md:mt-0">
                            {isOwnProfile && <Button onClick={() => setIsEditModalOpen(true)} variant="secondary">Edit Profile</Button>}
                            {isOwnProfile && profileUser.role === UserRole.USER && (
                                <Button onClick={() => setIsBecomeAuthorModalOpen(true)} variant="primary" className="ml-2">Become an Author</Button>
                            )}
                        </div>
                    </div>
                </div>

                 { showActivity && lastViewedNovel && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-4">Last Viewed</h2>
                        <div className="max-w-xs">
                           <NovelCard novel={lastViewedNovel} />
                        </div>
                    </div>
                 )}

                 {(profileUser.role === UserRole.AUTHOR || profileUser.role === UserRole.ADMIN) && (
                     <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-4">{isOwnProfile ? 'My Published Novels' : `Published Novels by ${profileUser.penName || profileUser.username}`}</h2>
                         {userNovels.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {userNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
                            </div>
                         ) : (
                            <p className="text-gray-500 dark:text-gray-400">This author hasn't published any novels yet.</p>
                         )}
                    </div>
                 )}
                 
                 {showBookmarks && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-4">{isOwnProfile ? 'My Bookmarks' : 'Bookmarked Novels'}</h2>
                         {bookmarkedNovels.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {bookmarkedNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
                            </div>
                         ) : (
                            <p className="text-gray-500 dark:text-gray-400">{isOwnProfile ? "You haven't bookmarked any novels yet." : "This user hasn't bookmarked any public novels."}</p>
                         )}
                    </div>
                 )}

            </div>
            {isOwnProfile && isEditModalOpen && <EditProfileModal user={profileUser} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />}
            {isOwnProfile && isBecomeAuthorModalOpen && (
                <BecomeAuthorModal 
                    isOpen={isBecomeAuthorModalOpen} 
                    onClose={() => setIsBecomeAuthorModalOpen(false)} 
                    onSubmit={handleBecomeAuthor}
                />
            )}
        </>
    );
};

// --- CREATE & EDIT NOVEL MODALS --- //
const CreateNovelModal = ({ isOpen, onClose, onNovelCreated }: { isOpen: boolean, onClose: () => void, onNovelCreated: (newNovel: Novel) => void }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [synopsis, setSynopsis] = useState('');
    const [genre, setGenre] = useState(GENRES[0]);
    const [tags, setTags] = useState('');
    const [language, setLanguage] = useState('English');
    const [status, setStatus] = useState<NovelStatus>(NovelStatus.DRAFT);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!user) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCoverImageFile(file);
            setCoverImagePreview(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setTitle('');
        setSynopsis('');
        setGenre(GENRES[0]);
        setTags('');
        setLanguage('English');
        setStatus(NovelStatus.DRAFT);
        setCoverImageFile(null);
        setCoverImagePreview(null);
        setError('');
        setIsSubmitting(false);
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !synopsis) {
            setError('Title and Synopsis are required.');
            return;
        }
        setError('');
        setIsSubmitting(true);

        const novelData = {
            title,
            synopsis,
            genre,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            language,
            status,
        };
        
        try {
            const newNovel = await ApiService.createNovel(user, novelData, coverImageFile || undefined);
            onNovelCreated(newNovel);
            handleClose();
        } catch (err) {
            console.error("Failed to create novel:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Create New Novel</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                        <Input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cover Image</label>
                        <div className="mt-1 flex items-center gap-4 p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                            {coverImagePreview ? 
                                <img src={coverImagePreview} alt="Cover preview" className="w-20 h-28 object-cover rounded"/> :
                                <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 text-sm">Preview</div>
                            }
                             <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                                <UploadIcon className="w-5 h-5"/>
                                <span>Upload Poster</span>
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Genre</label>
                        <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Synopsis</label>
                        <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={4} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
                        <Input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. magic, adventure" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                        <Input type="text" value={language} onChange={e => setLanguage(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <div className="flex gap-4 py-2">
                            <label className="flex items-center cursor-pointer">
                                <input type="radio" name="status" value={NovelStatus.DRAFT} checked={status === NovelStatus.DRAFT} onChange={() => setStatus(NovelStatus.DRAFT)} className="form-radio text-primary focus:ring-primary" />
                                <span className="ml-2 text-light-text dark:text-dark-text">Draft</span>
                            </label>
                             <label className="flex items-center cursor-pointer">
                                <input type="radio" name="status" value={NovelStatus.PUBLISHED} checked={status === NovelStatus.PUBLISHED} onChange={() => setStatus(NovelStatus.PUBLISHED)} className="form-radio text-primary focus:ring-primary" />
                                <span className="ml-2 text-light-text dark:text-dark-text">Published</span>
                            </label>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-2 pt-6 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Button type="button" onClick={handleClose} variant="ghost" disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating...
                            </span>
                        ) : 'Create Novel'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

const EditNovelModal = ({ novel, isOpen, onClose, onNovelUpdated }: { novel: Novel, isOpen: boolean, onClose: () => void, onNovelUpdated: (updatedNovel: Novel) => void }) => {
    const [title, setTitle] = useState(novel.title);
    const [synopsis, setSynopsis] = useState(novel.synopsis);
    const [genre, setGenre] = useState(novel.genre);
    const [tags, setTags] = useState(novel.tags.join(', '));
    const [language, setLanguage] = useState(novel.language);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(novel.coverImage);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCoverImageFile(file);
            setCoverImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !synopsis) {
            setError('Title and Synopsis are required.');
            return;
        }
        setError('');
        setIsSubmitting(true);

        const novelData: Partial<Novel> = {
            title,
            synopsis,
            genre,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            language,
            coverImage: coverImagePreview || novel.coverImage,
        };
        
        try {
            const updatedNovel = await ApiService.updateNovel(novel.id, novelData, coverImageFile || undefined);
            if (updatedNovel) {
              onNovelUpdated(updatedNovel);
            }
            onClose();
        } catch (err) {
            console.error("Failed to update novel:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">Edit Novel</h2>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                        <Input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cover Image</label>
                        <div className="mt-1 flex items-center gap-4 p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                            {coverImagePreview ? 
                                <img src={coverImagePreview} alt="Cover preview" className="w-20 h-28 object-cover rounded"/> :
                                <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 text-sm">Preview</div>
                            }
                             <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                                <UploadIcon className="w-5 h-5"/>
                                <span>Change Poster</span>
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Genre</label>
                        <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Synopsis</label>
                        <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={4} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
                        <Input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. magic, adventure" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                        <Input type="text" value={language} onChange={e => setLanguage(e.target.value)} />
                    </div>
                </div>
                 <div className="flex justify-end gap-2 pt-6 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Button type="button" onClick={onClose} variant="ghost" disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                        {isSubmitting ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

const ChapterEditorPage = () => {
    const { user } = useAuth();
    const { novelId, chapterNumber } = useParams();
    const navigate = useNavigate();
    
    const [novel, setNovel] = useState<Novel | null>(null);
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthor, setIsAuthor] = useState(false);
    
    type SaveStatus = 'idle' | 'changed' | 'saving' | 'saved' | 'error';
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const autoSaveTimeoutRef = useRef<number | null>(null);
    
    const isNew = chapterNumber === 'new';

    useEffect(() => {
        if (!novelId || !user || !supabase) {
            navigate('/');
            return;
        }

        ApiService.getNovel(novelId).then(novelData => {
            if (!novelData || novelData.authorId !== user.id) {
                navigate('/');
            } else {
                setNovel(novelData);
                setIsAuthor(true);
                if (!isNew) {
                    const chapNum = parseInt(chapterNumber!);
                    const currentChapter = novelData.chapters.find(c => c.chapterNumber === chapNum);
                    if (currentChapter) {
                        setChapter(currentChapter);
                        setTitle(currentChapter.title);
                        setContent(currentChapter.content);
                        setSaveStatus('saved');
                    }
                    setIsLoading(false);
                } else {
                    setIsLoading(false);
                    setSaveStatus('idle');
                }
            }
        });
    }, [novelId, chapterNumber, user, navigate, isNew]);

    useEffect(() => {
        if (isLoading || !novel) return;
        
        if (saveStatus === 'changed') {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            autoSaveTimeoutRef.current = window.setTimeout(async () => {
                setSaveStatus('saving');
                try {
                    if (isNew && !chapter) {
                        const newChapterNumber = novel.chapters.length > 0 ? Math.max(...novel.chapters.map(c => c.chapterNumber)) + 1 : 1;
                        const createdChapter = await ApiService.createChapter(novel.id, { title: title || 'Untitled Chapter', content }, newChapterNumber);
                        if (createdChapter) {
                            setChapter(createdChapter);
                            setSaveStatus('saved');
                            navigate(`/editor/${novel.id}/${createdChapter.chapterNumber}`, { replace: true });
                        } else {
                            throw new Error("Failed to create chapter");
                        }
                    } else if (chapter) {
                        await ApiService.updateChapter(chapter.id, { title, content });
                        setSaveStatus('saved');
                    }
                } catch (err) {
                    console.error("Auto-save failed:", err);
                    setSaveStatus('error');
                }
            }, 2000); // 2-second delay
        }

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [title, content, saveStatus, isLoading, chapter, isNew, novelId, navigate, novel]);


    const handleSaveAndExit = async () => {
        if (!novel) return;
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        
        setSaveStatus('saving');

        try {
            if (isNew && !chapter) {
                const newChapterNumber = novel.chapters.length > 0 ? Math.max(...novel.chapters.map(c => c.chapterNumber)) + 1 : 1;
                await ApiService.createChapter(novel.id, { title: title || 'Untitled Chapter', content }, newChapterNumber);
            } else if(chapter) {
                await ApiService.updateChapter(chapter.id, { title, content });
            }
            setSaveStatus('saved');
            navigate('/dashboard');
        } catch (err) {
            console.error("Final save failed:", err);
            setSaveStatus('error');
        }
    };

    if (!isAuthor) {
        return <div className="text-center py-10">Verifying author permissions...</div>;
    }
    if (isLoading) {
        return <div className="text-center py-10">Loading editor...</div>;
    }

    const getSaveStatusMessage = () => {
        switch (saveStatus) {
            case 'changed': return 'Unsaved changes...';
            case 'saving': return 'Saving...';
            case 'saved': return 'Draft saved.';
            case 'error': return <span className="text-red-500">Save failed.</span>;
            default: return '';
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold">{isNew ? 'Create New Chapter' : `Editing: ${chapter?.title || title}`}</h1>
                 <Link to="/dashboard">
                    <Button variant="ghost">Back to Dashboard</Button>
                 </Link>
            </div>
            <div className="bg-light-surface dark:bg-dark-surface p-6 rounded-lg shadow-md space-y-6">
                <div>
                    <label className="block text-lg font-medium text-gray-700 dark:text-gray-300">Chapter Title</label>
                    <Input 
                        type="text" 
                        value={title} 
                        onChange={e => { setTitle(e.target.value); setSaveStatus('changed'); }} 
                        placeholder="Enter your chapter title" 
                        className="!text-xl !py-3"
                    />
                </div>
                <div>
                    <label className="block text-lg font-medium text-gray-700 dark:text-gray-300">Content</label>
                    <textarea 
                        value={content}
                        onChange={e => { setContent(e.target.value); setSaveStatus('changed'); }}
                        placeholder="Start writing your story here..."
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-[60vh] font-serif"
                    />
                </div>
                <div className="flex justify-end items-center gap-4">
                    <span className="text-sm text-gray-500 italic min-h-[20px]">
                        {getSaveStatusMessage()}
                    </span>
                    <Button onClick={handleSaveAndExit} disabled={saveStatus === 'saving'}>Save and Exit</Button>
                </div>
            </div>
        </div>
    );
}

const AuthorDashboardPage = () => {
    const { user } = useAuth();
    const [myNovels, setMyNovels] = useState<Novel[]>([]);
    const [expandedNovels, setExpandedNovels] = useState<Record<string, boolean>>({});
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingNovel, setEditingNovel] = useState<Novel | null>(null);

    useEffect(() => {
        if (user && (user.role === UserRole.AUTHOR || user.role === UserRole.ADMIN)) {
            ApiService.getNovelsByAuthor(user.id).then(setMyNovels);
        }
    }, [user]);

    const toggleNovelExpansion = async (novelId: string) => {
        // Fetch full novel with chapters when expanding
        if (!expandedNovels[novelId]) {
            const fullNovel = await ApiService.getNovel(novelId);
            if (fullNovel) {
                setMyNovels(prev => prev.map(n => n.id === novelId ? fullNovel : n));
            }
        }
        setExpandedNovels(prev => ({ ...prev, [novelId]: !prev[novelId] }));
    };
    
    const handleToggleNovelStatus = async (e: React.MouseEvent<HTMLButtonElement>, novelId: string, currentStatus: NovelStatus) => {
        e.stopPropagation();
        const newStatus = currentStatus === NovelStatus.PUBLISHED ? NovelStatus.DRAFT : NovelStatus.PUBLISHED;
        await ApiService.updateNovelStatus(novelId, newStatus);
        setMyNovels(prevNovels => prevNovels.map(n => n.id === novelId ? {...n, status: newStatus} : n));
    };

    const handleToggleChapterStatus = async (e: React.MouseEvent<HTMLButtonElement>, novelId: string, chapterId: string, currentStatus: boolean) => {
        e.stopPropagation();
        const newStatus = !currentStatus;
        await ApiService.updateChapter(chapterId, { isPublished: newStatus });
        
        const fullNovel = await ApiService.getNovel(novelId);
        if (fullNovel) {
            setMyNovels(prev => prev.map(n => n.id === novelId ? fullNovel : n));
        }
    };
    
    const handleNovelCreated = (newNovel: Novel) => {
        setMyNovels(prevNovels => [newNovel, ...prevNovels]);
    };

    const handleNovelUpdated = (updatedNovel: Novel) => {
        setMyNovels(prevNovels => prevNovels.map(n => n.id === updatedNovel.id ? updatedNovel : n));
        setEditingNovel(null);
    };

    const handleDeleteNovel = async (e: React.MouseEvent, novelId: string, title: string) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to permanently delete the novel "${title}"? This cannot be undone.`)) {
            await ApiService.deleteNovel(novelId);
            setMyNovels(prev => prev.filter(n => n.id !== novelId));
        }
    };
    
    const handleEditNovelClick = (e: React.MouseEvent, novel: Novel) => {
        e.stopPropagation();
        setEditingNovel(novel);
    }

    if (!user || (user.role !== UserRole.AUTHOR && user.role !== UserRole.ADMIN)) {
        return <div className="text-center py-10">You must be an author or admin to view this page.</div>;
    }

    return (
        <>
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Author Dashboard</h1>
                    <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Create New Novel</Button>
                </div>

                <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {myNovels.map(novel => (
                            <li key={novel.id}>
                                <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => toggleNovelExpansion(novel.id)}>
                                <div className="flex items-center gap-4 flex-grow min-w-0">
                                    <img src={novel.coverImage} alt={novel.title} className="w-16 h-24 object-cover rounded flex-shrink-0"/>
                                    <div className="flex-grow min-w-0">
                                            <p className="font-semibold text-lg truncate">{novel.title}</p>
                                            <p className={`text-sm font-medium ${novel.status === NovelStatus.PUBLISHED ? 'text-green-500' : 'text-yellow-500'}`}>{novel.status}</p>
                                            <p className="text-xs text-gray-500">{novel.views} views • {novel.likes} likes</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                    <Button onClick={(e) => handleToggleNovelStatus(e, novel.id, novel.status)} variant="ghost" className="text-xs !px-2 !py-1">
                                        {novel.status === NovelStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
                                    </Button>
                                    <Button onClick={(e) => handleEditNovelClick(e, novel)} variant="ghost" title="Edit Novel"><EditIcon className="w-5 h-5"/></Button>
                                    <Button onClick={(e) => handleDeleteNovel(e, novel.id, novel.title)} variant="ghost" title="Delete Novel"><TrashIcon className="w-5 h-5 text-red-500"/></Button>
                                </div>
                                </div>
                                {expandedNovels[novel.id] && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700">
                                        <h4 className="font-semibold mb-2">Chapters</h4>
                                        <ul className="space-y-2">
                                            {novel.chapters?.map(chapter => (
                                                <li key={chapter.id} className="p-2 rounded-md bg-light-surface dark:bg-dark-surface flex justify-between items-center">
                                                    <div className="flex-grow">
                                                        <p>{chapter.chapterNumber}. {chapter.title}</p>
                                                        <p className={`text-xs ${chapter.isPublished ? 'text-green-500' : 'text-yellow-500'}`}>{chapter.isPublished ? 'Published' : 'Draft'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button onClick={(e) => handleToggleChapterStatus(e, novel.id, chapter.id, chapter.isPublished)} variant="ghost" className="!p-1.5" title={chapter.isPublished ? "Unpublish Chapter" : "Publish Chapter"}>
                                                            {chapter.isPublished ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                                                        </Button>
                                                        <Link to={`/editor/${novel.id}/${chapter.chapterNumber}`}>
                                                            <Button variant="ghost" className="!p-1.5" title="Edit Chapter"><EditIcon className="w-5 h-5"/></Button>
                                                        </Link>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4">
                                            <Link to={`/editor/${novel.id}/new`}>
                                                <Button variant="secondary" className="w-full">
                                                    <PlusIcon className="w-5 h-5 mr-2"/> Add New Chapter
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <CreateNovelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onNovelCreated={handleNovelCreated}
            />
            {editingNovel && (
                 <EditNovelModal
                    novel={editingNovel}
                    isOpen={!!editingNovel}
                    onClose={() => setEditingNovel(null)}
                    onNovelUpdated={handleNovelUpdated}
                />
            )}
        </>
    );
};

const EmailVerifiedPage = () => {
    const { showAuthModal } = useAuth();
    const navigate = useNavigate();

    const handleLoginClick = () => {
        navigate('/');
        showAuthModal();
    };

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <div className="bg-light-surface dark:bg-dark-surface p-8 rounded-lg shadow-lg max-w-md mx-auto">
                <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="text-3xl font-bold text-light-text dark:text-dark-text mt-4">Email Verified!</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Your email has been verified, please log in.
                </p>
                <Button onClick={handleLoginClick} className="mt-6">Login</Button>
            </div>
        </div>
    );
};

// --- ACCOUNT SETTINGS PAGE & COMPONENTS --- //
const DeleteAccountModal = ({ user, isOpen, onClose, onConfirm }: { user: User, isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const isMatch = confirmationText === user.username;

    const handleDelete = async () => {
        if (!isMatch) return;
        setIsDeleting(true);
        setError('');
        try {
            await onConfirm();
        } catch (e: any) {
            setError(e.message || 'Failed to delete account.');
            setIsDeleting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-500">Delete Account</h2>
            <p className="my-4 text-gray-600 dark:text-gray-400">
                This action is irreversible. All your data, including your profile, novels, and chapters, will be permanently deleted.
            </p>
            <p className="mb-2 text-sm">Please type <strong className="text-light-text dark:text-dark-text">{user.username}</strong> to confirm.</p>
            <Input 
                type="text" 
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className={!isMatch && confirmationText.length > 0 ? 'border-red-500 ring-red-500' : ''}
                aria-label="Confirm username for deletion"
            />
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            <div className="flex justify-end gap-2 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={onClose} variant="ghost" disabled={isDeleting}>Cancel</Button>
                <Button onClick={handleDelete} variant="danger" disabled={!isMatch || isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete My Account'}
                </Button>
            </div>
        </Modal>
    );
};

const AccountSettingsPage = () => {
    const { user, isUpdating, updateUser, deleteAccount } = useAuth();
    const navigate = useNavigate();
    
    // State for profile form
    const [username, setUsername] = useState(user?.username || '');
    const [penName, setPenName] = useState(user?.penName || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(user?.profilePicture || null);
    
    // State for privacy form
    // FIX: Explicitly type useState with <boolean> to avoid incorrect type inference of literal types (`true`), and use nullish coalescing (`??`) for correct default value logic.
    const [bookmarksPublic, setBookmarksPublic] = useState<boolean>(user?.bookmarksArePublic ?? true);
    const [activityPublic, setActivityPublic] = useState<boolean>(user?.activityIsPublic ?? true);

    const [statusMessage, setStatusMessage] = useState({ id: '', type: '', text: '' });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) {
            navigate('/');
        } else {
            setUsername(user.username);
            setPenName(user.penName || '');
            setBio(user.bio || '');
            setProfilePicPreview(user.profilePicture);
            setBookmarksPublic(user.bookmarksArePublic);
            setActivityPublic(user.activityIsPublic);
        }
    }, [user, navigate]);

    if (!user) {
        return null; // or a loading/redirect component
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMessage({ id: '', type: '', text: '' });
        
        const result = await updateUser({
            username,
            penName: user.role === UserRole.AUTHOR ? penName : user.penName,
            bio,
        }, profilePicFile || undefined);

        if (result.success) {
            setStatusMessage({ id: 'profile', type: 'success', text: 'Profile updated successfully!' });
        } else {
            setStatusMessage({ id: 'profile', type: 'error', text: result.message || 'Failed to update profile.' });
        }
        setProfilePicFile(null); // Clear file after submission
    };

    const handlePrivacyUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMessage({ id: '', type: '', text: '' });
        
        const result = await updateUser({
            bookmarksArePublic: bookmarksPublic,
            activityIsPublic: activityPublic,
        });
        
        if (result.success) {
            setStatusMessage({ id: 'privacy', type: 'success', text: 'Privacy settings saved!' });
        } else {
            setStatusMessage({ id: 'privacy', type: 'error', text: result.message || 'Failed to save settings.' });
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setProfilePicFile(file);
            setProfilePicPreview(URL.createObjectURL(file));
        }
    };
    
    const handleDeleteConfirm = async () => {
        const result = await deleteAccount();
        if (result.success) {
            setIsDeleteModalOpen(false);
            navigate('/');
        } else {
           throw new Error(result.message || 'An unexpected error occurred.');
        }
    };
    
    return (
       <>
            <div className="container mx-auto max-w-3xl p-4 md:p-8">
                <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
                
                {/* Profile Information Section */}
                <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Profile Information</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Picture</label>
                            <div className="mt-2 flex items-center gap-4">
                                <img src={profilePicPreview || user.profilePicture} alt="Profile preview" className="w-20 h-20 rounded-full object-cover"/>
                                <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>Upload New Image</Button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium">Username</label>
                            <Input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} required />
                        </div>
                         {user.role === UserRole.AUTHOR && (
                            <div>
                                <label htmlFor="penName" className="block text-sm font-medium">Pen Name</label>
                                <Input id="penName" type="text" value={penName} onChange={e => setPenName(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
                            <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-700 text-light-text dark:text-dark-text border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="flex justify-end items-center gap-4 pt-2">
                           {statusMessage.id === 'profile' && statusMessage.text && <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{statusMessage.text}</p>}
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Privacy Settings Section */}
                <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">Privacy Settings</h2>
                    <form onSubmit={handlePrivacyUpdate} className="space-y-6">
                       <div className="flex items-start">
                         <div className="flex-grow">
                            <label htmlFor="publicBookmarks" className="font-medium text-gray-900 dark:text-gray-100">Public Bookmarks</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Allow other users to see the novels you have bookmarked on your profile page.</p>
                         </div>
                         <label htmlFor="publicBookmarksToggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="publicBookmarksToggle" className="sr-only peer" checked={bookmarksPublic} onChange={() => setBookmarksPublic(!bookmarksPublic)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                         </label>
                       </div>
                       <div className="flex items-start">
                         <div className="flex-grow">
                            <label htmlFor="publicActivity" className="font-medium text-gray-900 dark:text-gray-100">Public Activity</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Allow other users to see your last viewed novel on your profile page.</p>
                         </div>
                         <label htmlFor="publicActivityToggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="publicActivityToggle" className="sr-only peer" checked={activityPublic} onChange={() => setActivityPublic(!activityPublic)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                         </label>
                       </div>
                       <div className="flex justify-end items-center gap-4 pt-2">
                           {statusMessage.id === 'privacy' && statusMessage.text && <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{statusMessage.text}</p>}
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? 'Saving...' : 'Save Privacy Settings'}
                            </Button>
                        </div>
                    </form>
                </div>
                
                {/* Danger Zone Section */}
                 <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-md p-6 border-2 border-red-300 dark:border-red-800/50">
                    <h2 className="text-xl font-semibold text-red-600 dark:text-red-500">Danger Zone</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-4">
                        Permanently delete your account and all of its content from the platform. This action is not reversible, so please continue with caution.
                    </p>
                    <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>Delete My Account</Button>
                </div>

            </div>
            {isDeleteModalOpen && (
                <DeleteAccountModal 
                    user={user}
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </>
    );
};

const BookmarksPage = () => {
    const { user } = useAuth();
    const [bookmarkedNovels, setBookmarkedNovels] = useState<Novel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            ApiService.getBookmarkedNovels(user.id)
                .then(setBookmarkedNovels)
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [user]);

    if (isLoading) {
        return <div className="text-center py-10">Loading your bookmarks...</div>;
    }

    if (!user) {
        return <div className="text-center py-10">Please sign in to see your bookmarks.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">My Bookmarks</h1>
            {bookmarkedNovels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {bookmarkedNovels.map(novel => <NovelCard key={novel.id} novel={novel} />)}
                </div>
            ) : (
                <div className="text-center py-10 bg-light-surface dark:bg-dark-surface rounded-lg shadow-md">
                    <p className="text-lg text-gray-500 dark:text-gray-400">You haven't bookmarked any novels yet.</p>
                    <p className="mt-2 text-gray-400">Click the <BookmarkIcon className="inline-block w-5 h-5 -mt-1" /> icon on a novel's page to save it here.</p>
                </div>
            )}
        </div>
    );
};


const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/novel/:id" element={<NovelDetailPage />} />
      <Route path="/read/:novelId/:chapterId" element={<ReaderPage />} />
      <Route path="/user/:userId" element={<ProfilePage />} />
      <Route path="/dashboard" element={<AuthorDashboardPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/editor/:novelId/:chapterNumber" element={<ChapterEditorPage />} />
      <Route path="/verified-email" element={<EmailVerifiedPage />} />
      <Route path="/settings" element={<AccountSettingsPage />} />
      <Route path="/bookmarks" element={<BookmarksPage />} />
    </Routes>
  );
};


// --- APP COMPONENT --- //
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  // FIX: Explicitly type useState with <boolean> to prevent TypeScript from inferring a literal `false` type.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  // FIX: Explicitly type useState with <boolean> to prevent TypeScript from inferring a literal `true` type.
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
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#/verified-email`,
        data: {
          username,
          email,
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

  const updateUser = async (updatedData: Partial<User>, profilePicFile?: File): Promise<{success: boolean, message?: string}> => {
    if (!user || !supabase) return { success: false, message: 'User not authenticated' };
    setIsUpdating(true);
    try {
        let profileUpdateData: Partial<User> = { ...updatedData };
        
        let authUpdateData: { data: any, password?: string } = { data: {
            username: updatedData.username,
            pen_name: updatedData.penName,
            bio: updatedData.bio,
        }};

        if (profilePicFile) {
            const newProfilePicUrl = await ApiService.uploadProfilePicture(profilePicFile);
            if (newProfilePicUrl) {
                profileUpdateData.profilePicture = newProfilePicUrl;
                authUpdateData.data.profile_picture = newProfilePicUrl;
            }
        }
        
        // Update auth user metadata
        const { error: authError } = await supabase.auth.updateUser(authUpdateData);
        if (authError) throw authError;

        // Update public profiles table
        const updatedUser = await ApiService.updateUser(user.id, profileUpdateData);
        if (updatedUser) {
            setUser(updatedUser);
        } else {
            throw new Error("Failed to update user profile in database.");
        }
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update user:", error);
        return { success: false, message: error.message };
    } finally {
        setIsUpdating(false);
    }
  };

  const deleteAccount = async (): Promise<{success: boolean, message?: string}> => {
    const { success, error } = await ApiService.deleteSelf();
    if(success) {
      // The RPC call signs the user out by deleting them, but we clear state just in case.
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } else {
      return { success: false, message: error?.message || "An error occurred during account deletion." };
    }
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
    isUpdating,
    login,
    signup,
    logout,
    updateUser,
    deleteAccount,
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
      <HashRouter>
        <div className="flex flex-col min-h-screen font-sans text-light-text dark:text-dark-text">
          <Header />
          <main className="flex-grow">
            <AppRouter />
          </main>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
