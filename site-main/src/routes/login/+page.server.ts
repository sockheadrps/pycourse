import { supabase } from '$lib/supabase';

export const load = async () => {
	const { data, error } = await supabase.from('todos').select('*');

	return {
		todos: data ?? []
	};
};
