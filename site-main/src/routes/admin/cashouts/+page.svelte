<script lang="ts">
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
  
    let cashouts = [];
    let loading = false;
    let error = '';
    let tokenRatio = 100; // default
  
    async function loadTokenRatio() {
      try {
        const res = await fetch('/api/token-ratio');
        const data = await res.json();
        if (data.ratio) {
          tokenRatio = data.ratio;
        }
      } catch (e) {
        console.error(e);
        error = 'Failed to load token ratio';
      }
    }
  
    async function loadCashouts() {
      loading = true;
      error = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          error = 'Not logged in!';
          return;
        }
  
        const res = await fetch('/api/admin/cashouts', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        cashouts = data.cashouts || [];
      } catch (e) {
        console.error(e);
        error = 'Failed to load payouts';
      } finally {
        loading = false;
      }
    }
  
    async function confirmPayout(id: number) {
      loading = true;
      error = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          error = 'Not logged in!';
          return;
        }
  
        const res = await fetch(`/api/admin/cashouts/${id}/confirm`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ Payout confirmed!');
          await loadCashouts();
        } else {
          error = 'Failed to confirm payout';
        }
      } catch (err) {
        console.error(err);
        error = 'Error confirming payout';
      } finally {
        loading = false;
      }
    }
  
    onMount(async () => {
      await loadTokenRatio();
      await loadCashouts();
    });
  </script>
  
  <h1>Admin Payouts</h1>
  {#if error}<p style="color: red;">{error}</p>{/if}
  {#if loading && cashouts.length === 0}<p>Loading...</p>{/if}
  {#if cashouts.length === 0 && !loading}<p>No pending payouts</p>{/if}
  
  {#each cashouts as c}
    <div class="payout">
      <p><strong>User:</strong> {c.user_id}</p>
      <p><strong>Address:</strong> {c.bitcoin_address}</p>
      <p><strong>Amount:</strong> {c.token_amount} tokens</p>
      <p><strong>BTC Amount:</strong> {(c.token_amount / tokenRatio).toFixed(8)} BTC</p>
      <p><strong>Date:</strong> {c.created_at}</p>
      <button on:click={() => confirmPayout(c.id)} disabled={loading}>
        {loading ? 'Processing...' : 'Confirm Payout'}
      </button>
    </div>
  {/each}
  
  <style>
    .payout {
      border: 1px solid #444;
      margin-bottom: 1rem;
      padding: 1rem;
      border-radius: 4px;
    }
  </style>
  