// Global variables
let guideDataCache = {};

// Note: Dashboard initialization is now handled in the HTML template
// with proper authentication checks

// Load guides from the API
async function loadGuides() {
  const loading = document.getElementById('loading');
  const guidesGrid = document.getElementById('guidesGrid');

  loading.classList.add('show');

  try {
    const response = await fetch('/guides/api/guides');
    const data = await response.json();

    if (data.guides && data.guides.length > 0) {
      displayGuides(data.guides);
    } else {
      displayEmptyState();
    }
  } catch (error) {
    console.error('Failed to load guides:', error);
    showNotification('Failed to load guides', 'error');
    displayEmptyState();
  } finally {
    loading.classList.remove('show');
  }
}

// Display guides in the grid
function displayGuides(guides) {
  const guidesGrid = document.getElementById('guidesGrid');
  guidesGrid.innerHTML = '';

  guides.forEach((guide) => {
    const card = createGuideCard(guide);
    guidesGrid.appendChild(card);
  });
}

// Create a guide card element
function createGuideCard(guide) {
  const card = document.createElement('div');
  card.className = 'guide-card';
  card.id = `card-${guide.slug}`;
  card.setAttribute('data-expanded', 'false');
  card.setAttribute('data-current-view', 'published');

  // Calculate stats
  const totalSteps =
    guide.tutorial?.phases?.reduce((total, phase) => total + (phase.steps?.length || 0), 0) || 0;
  const totalPhases = guide.tutorial?.phases?.length || 0;
  const flowSteps =
    guide.flow?.phases?.reduce((total, phase) => total + (phase.steps?.length || 0), 0) || 0;

  // Determine which badges to show
  const hasPublished = guide.has_published;
  const hasDraft = guide.has_draft;

  let badgeHtml = '';
  if (hasPublished && hasDraft) {
    badgeHtml = `
      <div class="status-badge status-published active" onclick="switchGuideData('${guide.slug}', 'published')">Published</div>
      <div class="status-badge status-draft-only" onclick="switchGuideData('${guide.slug}', 'draft')">Draft</div>
    `;
  } else if (hasPublished) {
    badgeHtml = `<div class="status-badge status-published active">Published</div>`;
  } else if (hasDraft) {
    badgeHtml = `<div class="status-badge status-draft-only active">Draft</div>`;
  }
  // Add slug as a badge (now clickable)
  badgeHtml += `<span class="guide-slug" style="cursor:pointer;" data-guide-slug="${guide.slug}">${guide.slug}</span>`;

  // Status section (task bar)
  const statusSection = `<div class="status-section">${badgeHtml}</div>`;

  card.innerHTML = `
    ${statusSection}
    <div class="guide-header">
      <div class="guide-header-content">
        <h3 class="guide-title">${guide.title || 'Untitled Guide'}</h3>
        <div class="guide-bottom-content">
          <p class="guide-description">${guide.description || 'No description available'}</p>
          <div class="guide-stats">
            <div class="stat">
              <span class="stat-icon">📝</span>
              <span class="stat-value">${totalPhases}</span>
              <span class="stat-label">Phases</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🔢</span>
              <span class="stat-value">${totalSteps}</span>
              <span class="stat-label">Tutorial Steps</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🔄</span>
              <span class="stat-value">${flowSteps}</span>
              <span class="stat-label">Flow Steps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="guide-content">
      <div class="guide-actions">
        <a href="/admin/edit-guide/${guide.slug}" class="btn-small btn-edit">✏️ Edit</a>
        ${
          hasDraft
            ? `<button onclick="previewGuide('${guide.slug}')" class="btn-small btn-preview">👁️ Preview</button>`
            : ''
        }
        ${
          hasDraft
            ? `<button onclick="publishFromDraft('${guide.slug}')" class="btn-small btn-publish">🚀 Publish</button>`
            : ''
        }
        <button onclick="deleteGuide('${
          guide.slug
        }')" class="btn-small btn-delete">🗑️ Delete</button>
      </div>
    </div>

    <div class="compact-stats">
      <div class="compact-stat">
        <span>👁️</span>
        <span class="compact-stat-value">${guide.view_stats?.total_views || 0}</span>
        <span>views</span>
      </div>
      <div class="compact-stat views">
        <span>👤</span>
        <span class="compact-stat-value">${guide.view_stats?.unique_viewers || 0}</span>
        <span>unique</span>
      </div>
    </div>
  `;

  // Add click event for the slug badge
  card.querySelector('.guide-slug').addEventListener('click', function (e) {
    e.stopPropagation();
    const publishedBadge = card.querySelector('.status-published');
    const draftBadge = card.querySelector('.status-draft-only');
    let url = `/admin/edit-guide/${guide.slug}`;
    if (draftBadge && draftBadge.classList.contains('active')) {
      // If you want to indicate draft mode, you could add a query param:
      url += '?draft=1';
    }
    window.location.href = url;
  });

  // Add click event for card expansion
  card.addEventListener('click', function (e) {
    // Don't expand if clicking on badges, buttons, or content areas
    if (
      e.target.closest('.status-badge') ||
      e.target.closest('.btn-small') ||
      e.target.closest('a') ||
      e.target.closest('.guide-content') ||
      e.target.closest('pre') ||
      e.target.closest('code') ||
      e.target.closest('p') ||
      e.target.closest('div') && e.target.closest('.guide-content')
    ) {
      return;
    }

    toggleCardExpansion(card);
  });

  return card;
}

// Toggle card expansion
function toggleCardExpansion(card) {
  const isExpanded = card.getAttribute('data-expanded') === 'true';
  card.setAttribute('data-expanded', !isExpanded);
}

// Switch between published and draft data
async function switchGuideData(slug, type) {
  const card = document.getElementById(`card-${slug}`);
  if (!card) return;

  // Update badge active states
  const publishedBadge = card.querySelector('.status-published');
  const draftBadge = card.querySelector('.status-draft-only');

  if (publishedBadge) publishedBadge.classList.remove('active');
  if (draftBadge) draftBadge.classList.remove('active');

  if (type === 'published' && publishedBadge) {
    publishedBadge.classList.add('active');
  } else if (type === 'draft' && draftBadge) {
    draftBadge.classList.add('active');
  }

  // Load data if not cached
  if (!guideDataCache[slug]) {
    try {
      const response = await fetch(`/guides/api/guides`);
      const data = await response.json();
      const guide = data.guides.find((g) => g.slug === slug);
      if (guide) {
        guideDataCache[slug] = guide;
      }
    } catch (error) {
      console.error('Failed to load guide data:', error);
      return;
    }
  }

  const guide = guideDataCache[slug];
  if (!guide) return;

  // Update card content based on type
  const titleElement = card.querySelector('.guide-title');
  const descriptionElement = card.querySelector('.guide-description');
  const statsElement = card.querySelector('.guide-stats');

  if (type === 'published') {
    // Show published data
    if (titleElement) titleElement.textContent = guide.title || 'Untitled Guide';
    if (descriptionElement)
      descriptionElement.textContent = guide.description || 'No description available';

    // Update stats for published data
    if (statsElement && guide.tutorial) {
      const totalSteps =
        guide.tutorial.phases?.reduce((total, phase) => total + (phase.steps?.length || 0), 0) || 0;
      const totalPhases = guide.tutorial.phases?.length || 0;
      const flowSteps =
        guide.flow?.phases?.reduce((total, phase) => total + (phase.steps?.length || 0), 0) || 0;

      statsElement.innerHTML = `
        <div class="stat">
          <span class="stat-icon">📝</span>
          <span class="stat-value">${totalPhases}</span>
          <span class="stat-label">Phases</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🔢</span>
          <span class="stat-value">${totalSteps}</span>
          <span class="stat-label">Tutorial Steps</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🔄</span>
          <span class="stat-value">${flowSteps}</span>
          <span class="stat-label">Flow Steps</span>
        </div>
      `;
    }
  } else if (type === 'draft') {
    // Fetch draft data separately
    try {
      const draftDataResponse = await fetch(`/guides/${slug}/draft.json`);
      if (draftDataResponse.ok) {
        const draftData = await draftDataResponse.json();

        if (titleElement)
          titleElement.textContent = draftData.tutorial?.title || 'Untitled Guide (Draft)';
        if (descriptionElement)
          descriptionElement.textContent =
            draftData.tutorial?.description || 'No description available (Draft)';

        // Update stats for draft data
        if (statsElement && draftData.tutorial) {
          const totalSteps =
            draftData.tutorial.phases?.reduce(
              (total, phase) => total + (phase.steps?.length || 0),
              0
            ) || 0;
          const totalPhases = draftData.tutorial.phases?.length || 0;
          const flowSteps =
            draftData.flow?.phases?.reduce(
              (total, phase) => total + (phase.steps?.length || 0),
              0
            ) || 0;

          statsElement.innerHTML = `
            <div class="stat">
              <span class="stat-icon">📝</span>
              <span class="stat-value">${totalPhases}</span>
              <span class="stat-label">Phases</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🔢</span>
              <span class="stat-value">${totalSteps}</span>
              <span class="stat-label">Tutorial Steps</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🔄</span>
              <span class="stat-value">${flowSteps}</span>
              <span class="stat-label">Flow Steps</span>
            </div>
          `;
        }
      } else {
        console.error('Failed to fetch draft data');
        showNotification('Failed to load draft data', 'error');
      }
    } catch (error) {
      console.error('Failed to load draft data:', error);
      showNotification('Failed to load draft data', 'error');
    }
  }

  // Store current view type
  card.setAttribute('data-current-view', type);
}

// Load overall statistics
async function loadOverallStats() {
  const overallStats = document.getElementById('overallStats');

  try {
    const response = await makeAuthenticatedRequest('/admin/stats');
    const stats = await response.json();

    // Populate the original stats container (for fallback)
    overallStats.innerHTML = `
      <div class="overall-stat">
        <div class="overall-stat-value">${stats.total_guides}</div>
        <div class="overall-stat-label">Total Guides</div>
      </div>
      <div class="overall-stat">
        <div class="overall-stat-value">${stats.total_views}</div>
        <div class="overall-stat-label">Total Views</div>
      </div>
      <div class="overall-stat">
        <div class="overall-stat-value">${stats.unique_viewers}</div>
        <div class="overall-stat-label">Unique Viewers</div>
      </div>
      <div class="overall-stat">
        <div class="overall-stat-value">${stats.draft_guides}</div>
        <div class="overall-stat-label">Draft Guides</div>
      </div>
    `;

    // Populate the new stat elements in the header container
    const stat1 = document.getElementById('stat1');
    const stat2 = document.getElementById('stat2');
    const stat3 = document.getElementById('stat3');
    const stat4 = document.getElementById('stat4');

    if (stat1) {
      stat1.innerHTML = `
        <div class="overall-stat-value">${stats.total_guides}</div>
        <div class="overall-stat-label">Total Guides</div>
      `;
    }

    if (stat2) {
      stat2.innerHTML = `
        <div class="overall-stat-value">${stats.total_views}</div>
        <div class="overall-stat-label">Total Views</div>
      `;
    }

    if (stat3) {
      stat3.innerHTML = `
        <div class="overall-stat-value">${stats.unique_viewers}</div>
        <div class="overall-stat-label">Unique Viewers</div>
      `;
    }

    if (stat4) {
      stat4.innerHTML = `
        <div class="overall-stat-value">${stats.draft_guides}</div>
        <div class="overall-stat-label">Draft Guides</div>
      `;
    }

  } catch (error) {
    console.error('Failed to load overall stats:', error);
    overallStats.innerHTML = `
      <div class="overall-stat">
        <div class="overall-stat-value">-</div>
        <div class="overall-stat-label">Stats Unavailable</div>
      </div>
    `;

    // Clear the header stat elements on error
    const stat1 = document.getElementById('stat1');
    const stat2 = document.getElementById('stat2');
    const stat3 = document.getElementById('stat3');
    const stat4 = document.getElementById('stat4');

    if (stat1) stat1.innerHTML = '<div class="overall-stat-value">-</div><div class="overall-stat-label">Error</div>';
    if (stat2) stat2.innerHTML = '<div class="overall-stat-value">-</div><div class="overall-stat-label">Error</div>';
    if (stat3) stat3.innerHTML = '<div class="overall-stat-value">-</div><div class="overall-stat-label">Error</div>';
    if (stat4) stat4.innerHTML = '<div class="overall-stat-value">-</div><div class="overall-stat-label">Error</div>';
  }
}

// Load top guides
async function loadTopGuides() {
  try {
    const response = await makeAuthenticatedRequest('/admin/top-guides');
    const data = await response.json();

    const topGuidesContainer = document.getElementById('topGuides');
    if (data.top_guides && data.top_guides.length > 0) {
      topGuidesContainer.innerHTML = data.top_guides
        .map(
          (guide) => `
        <div class="top-guide-item" onclick="window.location.href='/guides/${guide.slug}/tutorial'">
          <div class="top-guide-title">${guide.title}</div>
          <div class="top-guide-stats">
            <div class="top-guide-stat">
              <span>👁️</span>
              <span class="top-guide-stat-value">${guide.total_views}</span>
            </div>
            <div class="top-guide-stat">
              <span>👤</span>
              <span class="top-guide-stat-value">${guide.unique_viewers}</span>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    } else {
      topGuidesContainer.innerHTML =
        '<div style="color: rgba(255,255,255,0.7); text-align: center; font-size: 0.9rem;">No published guides yet</div>';
    }
  } catch (error) {
    console.error('Failed to load top guides:', error);
  }
}

// Display empty state
function displayEmptyState() {
  const guidesGrid = document.getElementById('guidesGrid');
  guidesGrid.innerHTML = `
    <div class="empty-state">
      <h3>No guides found</h3>
      <p>Create your first guide to get started!</p>
      <a href="/admin/edit-guide/new" class="btn btn-primary">Create New Guide</a>
    </div>
  `;
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 100);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

// Preview guide
async function previewGuide(slug) {
  try {
    const response = await makeAuthenticatedRequest(`/admin/preview-guide/${slug}`, {
      method: 'GET',
    });

    if (response.ok) {
      window.open(`/guides/${slug}/tutorial?preview=true`, '_blank');
    } else {
      const errorData = await response.json();
      showNotification(`Failed to preview: ${errorData.detail || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Failed to preview guide:', error);
    showNotification('Failed to preview guide', 'error');
  }
}

// Publish guide from draft
async function publishFromDraft(slug) {
  if (!confirm('Are you sure you want to publish this guide from draft?')) {
    return;
  }

  try {
    const response = await makeAuthenticatedRequest(`/admin/regenerate-guide/${slug}`, {
      method: 'POST',
    });

    if (response.ok) {
      const result = await response.json();
      showNotification(result.message || 'Guide published successfully!');
      loadGuides(); // Refresh the list
    } else {
      const errorData = await response.json();
      showNotification(`Failed to publish: ${errorData.detail || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Failed to publish guide:', error);
    showNotification('Failed to publish guide', 'error');
  }
}

// Delete guide
async function deleteGuide(slug) {
  if (!confirm('Are you sure you want to delete this guide? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await makeAuthenticatedRequest(`/admin/delete-guide/${slug}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      showNotification('Guide deleted successfully!');
      loadGuides(); // Refresh the list
    } else {
      const errorData = await response.json();
      showNotification(`Failed to delete: ${errorData.detail || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Failed to delete guide:', error);
    showNotification('Failed to delete guide', 'error');
  }
}

// Regenerate all guides
async function regenerateAllGuides() {
  if (!confirm('Are you sure you want to regenerate all guides? This may take a moment.')) {
    return;
  }

  const loading = document.getElementById('loading');
  loading.classList.add('show');

  try {
    const response = await makeAuthenticatedRequest('/regenerate', {
      method: 'POST',
    });

    if (response.ok) {
      const result = await response.json();
      showNotification(result.message || 'All guides regenerated successfully!');
      loadGuides(); // Refresh the list
    } else {
      const errorData = await response.json();
      showNotification(`Failed to regenerate: ${errorData.message || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Failed to regenerate guides:', error);
    showNotification('Failed to regenerate guides', 'error');
  } finally {
    loading.classList.remove('show');
  }
}

// Refresh guides
async function refreshGuides() {
  showNotification('Refreshing guides...');
  await loadGuides();
  await loadOverallStats();
  await loadTopGuides();
  showNotification('Guides refreshed successfully!');
}
