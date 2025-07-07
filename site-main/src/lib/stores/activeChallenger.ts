import { writable } from 'svelte/store';

export const activeChallenger = writable<{ username: string; wager: number } | null>(null);