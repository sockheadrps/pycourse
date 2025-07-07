<script lang="ts">
    export let challenger: { username: string; wager: number };
    export let onConfirm: () => void;
    export let onCancel: () => void;
    export let onChoice: (choice: 'rock' | 'paper' | 'scissors') => void;
  
    let confirmed = false;
  
    function confirmChallenge() {
      confirmed = true;
      onConfirm();
    }
  </script>
  
  <div class="arena-modal">
    {#if !confirmed}
      <p>{challenger.username} challenged you for {challenger.wager} tokens!</p>
      <button on:click={confirmChallenge}>Accept Challenge</button>
      <button on:click={onCancel}>Decline</button>
    {:else}
      <p>Choose your move:</p>
      <div class="choices">
        <button on:click={() => onChoice('rock')}>🪨 Rock</button>
        <button on:click={() => onChoice('paper')}>📄 Paper</button>
        <button on:click={() => onChoice('scissors')}>✂️ Scissors</button>
      </div>
    {/if}
  </div>
  
  <style>
    .arena-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1f24;
      border: 2px solid #ffce00;
      padding: 1rem;
      border-radius: 8px;
      z-index: 100;
    }
  
    .choices {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
  
    button {
      padding: 0.5rem 1rem;
      background: #4d90fe;
      border: none;
      color: white;
      border-radius: 4px;
      cursor: pointer;
    }
  
    button:hover {
      background: #357ae8;
    }
  </style>
  