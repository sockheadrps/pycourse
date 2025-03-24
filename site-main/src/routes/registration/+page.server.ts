import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { AuthApiError } from '@supabase/supabase-js';

export const actions: Actions = {
	register: async ({ request, locals }) => {
		const body = Object.fromEntries(await request.formData());

		const { data, error: signUpError } = await locals.sb.auth.signUp({
			email: body.email as string,
			password: body.password as string
		});

		if (signUpError) {
			if (signUpError instanceof AuthApiError && signUpError.status === 400) {
				return fail(400, {
					error: 'Invalis email or password'
				});
			}
			return fail(500, {
				error: 'Server error'
			});
		}

		if (data) {
			console.log('inserting user into read_posts', data);
			const user = data.user;
			if (user) {
				const { error: insertError } = await locals.sb.from('read_posts').insert({
					id: user.id,
					read_posts: []
				});

				if (insertError) {
					console.error('Failed to insert into read_posts:', insertError.message);
					return fail(500, { error: 'Failed to track user registration' });
				}
			}
			throw redirect(303, '/');
		}
	}
};
