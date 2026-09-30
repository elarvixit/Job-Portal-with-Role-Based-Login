// Shared by the server layout (inline <head> script) and the client ThemeToggle.

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'hl-theme';

/** Runs in <head> before first paint so a saved Light/Dark choice never flashes the wrong theme. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;
