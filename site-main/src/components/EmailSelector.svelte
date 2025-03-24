<!-- EmailSelector.svelte -->
<script>
  // Accept data as props
  export let council = {};
  export let school_board = {};
  export let reps = []; // If your 'reps' are just an array of names

  // We’ll track whether our modal is open
  let showPopup = false;

  // Convert the Council and School Board objects to arrays for iteration
  let councilArray = Object.values(council);
  let schoolBoardArray = Object.values(school_board);
  let repsArray = reps; // 'reps' might already be an array of strings

  // Track selected states in parallel arrays
  let selectedCouncil = councilArray.map(() => false);
  let selectedSchoolBoard = schoolBoardArray.map(() => false);
  let selectedReps = repsArray.map(() => false);

  // Build a semicolon-delimited string of selected emails (or names)
  function getSelectedEmails() {
    let result = [];

    councilArray.forEach((person, i) => {
      if (selectedCouncil[i]) {
        // If person has an 'email' property, use it – otherwise fallback to name
        result.push(person.email || person.name);
      }
    });

    schoolBoardArray.forEach((person, i) => {
      if (selectedSchoolBoard[i]) {
        result.push(person.email || person.name);
      }
    });

    repsArray.forEach((rep, i) => {
      if (selectedReps[i]) {
        // If reps are just names, push the name – or adapt to an email if you have it
        result.push(rep);
      }
    });

    // Return a semicolon-delimited string
    return result.join("; ");
  }

  // “Select All” toggles for each column
  function selectAllCouncil() {
    selectedCouncil = selectedCouncil.map(() => true);
  }
  function selectAllSchoolBoard() {
    selectedSchoolBoard = selectedSchoolBoard.map(() => true);
  }
  function selectAllReps() {
    selectedReps = selectedReps.map(() => true);
  }
</script>

<!-- A button that opens the popup -->
<button on:click={() => (showPopup = true)}>
  Open Email Recipients
</button>

<!-- Conditionally render the modal popup -->
{#if showPopup}
  <div class="modal-overlay" on:click={(e) => {
    // Close if user clicks outside the modal-content
    if (e.target.classList.contains('modal-overlay')) showPopup = false;
  }}>
    <div class="modal-content">
      <h2>Select Recipients</h2>

      <div class="columns">
        <!-- Council Column -->
        <div class="column">
          <h3>City Council</h3>
          <button on:click={selectAllCouncil}>Select All Council</button>
          {#each councilArray as person, i}
            <div class="checkbox-row">
              <input type="checkbox" bind:checked={selectedCouncil[i]} />
              <label>{person.name}</label>
            </div>
          {/each}
        </div>

        <!-- School Board Column -->
        <div class="column">
          <h3>School Board</h3>
          <button on:click={selectAllSchoolBoard}>Select All Board</button>
          {#each schoolBoardArray as person, i}
            <div class="checkbox-row">
              <input type="checkbox" bind:checked={selectedSchoolBoard[i]} />
              <label>{person.name}</label>
            </div>
          {/each}
        </div>

        <!-- Other Reps Column -->
        <div class="column">
          <h3>Other Reps</h3>
          <button on:click={selectAllReps}>Select All Reps</button>
          {#each repsArray as rep, i}
            <div class="checkbox-row">
              <input type="checkbox" bind:checked={selectedReps[i]} />
              <label>{rep}</label>
            </div>
          {/each}
        </div>
      </div>

      <hr />

      <!-- Shows the “to” string as you pick checkboxes -->
      <div>
        <h4>Selected Emails / Names:</h4>
        <textarea rows="4" readonly>{getSelectedEmails()}</textarea>
      </div>

      <button on:click={() => (showPopup = false)}>Close</button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999; /* or above other content */
  }

  .modal-content {
    background: #fff;
    border-radius: 8px;
    max-width: 80vw;
    padding: 1rem;
  }

  .columns {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .column {
    flex: 1 1 250px;
    border: 1px solid #ccc;
    padding: 0.5rem;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0.25rem 0;
  }

  textarea {
    width: 100%;
    resize: vertical;
  }
</style>
