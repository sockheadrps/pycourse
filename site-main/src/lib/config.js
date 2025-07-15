import { dev } from '$app/environment';

/**
 * @type {string}
 */
export const title = 'Socks Thought Shop';

/**
 * @type {string}
 */
export const description = 'Thought dumping ground for Sock';

/**
 * @type {string}
 */
export const url = dev ? 'http://localhost:5173' : 'url';

/**
 * @type {string}
 */
export const guideServerUrl =
	import.meta.env.VITE_GUIDE_SERVER_URL ||
	(dev ? 'http://localhost:8002' : 'https://guides.yourdomain.com');
