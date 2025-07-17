import { writable } from 'svelte/store';
import { guideServerUrl } from '$lib/config.js';

export interface Guide {
	slug: string;
	title: string;
	description: string;
}

function createGuidesStore() {
	const { subscribe, set, update } = writable<{
		guides: Guide[];
		loading: boolean;
		error: string | null;
	}>({
		guides: [],
		loading: false,
		error: null
	});

	return {
		subscribe,
		fetchGuides: async () => {
			update((state) => ({ ...state, loading: true, error: null }));

			try {
				const response = await fetch(`${guideServerUrl}/guides`);
				if (!response.ok) {
					throw new Error(`Failed to fetch guides: ${response.status}`);
				}

				const data: Guide[] = await response.json();
				update((state) => ({
					...state,
					guides: data,
					loading: false
				}));
			} catch (error) {
				console.error('Error fetching guides:', error);
				update((state) => ({
					...state,
					error: error instanceof Error ? error.message : 'Failed to fetch guides',
					loading: false
				}));
			}
		},
		clearError: () => {
			update((state) => ({ ...state, error: null }));
		}
	};
}
export const guides = createGuidesStore();
