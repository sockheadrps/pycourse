<script lang="ts">
    import { supabase } from '$lib/supabase';
    let email = '';
    let message = '';
    let error = '';
  
    async function forgotPassword() {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://your-site.com/reset-password'
      });
  
      if (err) {
        error = err.message;
        message = '';
      } else {
        message = 'Password reset email sent! Check your inbox.';
        error = '';
      }
    }
  </script>
  
  <main>
    <h1>Forgot Password</h1>
    <form on:submit|preventDefault={forgotPassword}>
      <input
        type="email"
        placeholder="Your email"
        bind:value={email}
        required
      />
      <button type="submit">Send Reset Email</button>
    </form>
    {#if message}<p>{message}</p>{/if}
    {#if error}<p style="color:red;">{error}</p>{/if}
  </main>
  
  <style>
    main {
      max-width: 400px;
      margin: 4rem auto;
      padding: 2rem;
      background: var(--surface-2);
      border-radius: var(--radius-2);
      box-shadow: var(--shadow-2);
    }
  
    h1 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: var(--gray-9);
    }
  
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  
    input {
      padding: 0.5rem;
      border: 1px solid var(--gray-3);
      border-radius: var(--radius-1);
      background: var(--surface-1);
    }
  
    button {
      background: var(--blue-6);
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: var(--radius-1);
      cursor: pointer;
      transition: background 0.3s;
    }
  
    button:hover {
      background: var(--blue-7);
    }
  
    p {
      text-align: center;
      margin-top: 1rem;
    }
  </style>
  