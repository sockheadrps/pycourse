<script lang="ts">
    import { supabase } from '$lib/supabase';
    import { onMount } from 'svelte';
  
    let newPassword = '';
    let confirmPassword = '';
    let message = '';
    let error = '';
  
    // This runs when the user lands on this page with the magic link
    onMount(async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        error = 'Invalid or expired reset link. Please try again.';
      }
    });
  
    async function resetPassword() {
      if (newPassword !== confirmPassword) {
        error = 'Passwords do not match.';
        message = '';
        return;
      }
  
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
  
      if (updateError) {
        error = updateError.message;
        message = '';
      } else {
        message = 'Your password has been reset successfully!';
        error = '';
        // Optional: Redirect to login page after a delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    }
  </script>
  
  <main>
    <h1>Reset Password</h1>
    <form on:submit|preventDefault={resetPassword}>
      <input
        type="password"
        placeholder="New Password"
        bind:value={newPassword}
        required
      />
      <input
        type="password"
        placeholder="Confirm Password"
        bind:value={confirmPassword}
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  
    {#if message}<p style="color:green;">{message}</p>{/if}
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
  