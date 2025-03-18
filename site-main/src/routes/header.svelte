<script lang="ts">
	import * as config from '$lib/config'
</script>


<div class="title_rule">
  <nav>
    <a href="/" class="title">
      <b>{config.title}</b>
    </a>
  
    <ul class="links">
      <li>
        <a href="/about">About</a>
      </li>
      <!-- <li>
        <a href="/contact">Contact</a>
      </li> -->
      <li>
        <a href="/rss.xml" target="_blank">RSS</a>
      </li>
    </ul>
  
    <!-- <button>Toggle</button> -->
  </nav>
</div>



<style>
  nav {
    padding-block: var(--size-7);
    padding-bottom: 1rem;
  }

  .links {
    margin-block: var(--size-7);
  }

  a {
  color: var(--gray-6);
  text-decoration: none;
}

.title_rule {
  border-bottom: 1px solid var(--gray-6);
}

a:hover {
  text-decoration: underline;
}

  @media (min-width: 768px) {
    nav {
      display: flex;
      justify-content: space-between;
    }

    .links {
      display: flex;
      gap: var(--size-7);
      margin-block: 0;
    }
  }
a[aria-current='page']::before {
  view-transition-name: active-page;
}
</style>