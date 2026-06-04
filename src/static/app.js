document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (bulleted list, with remove button)
        const participantsHtml = details.participants && details.participants.length
          ? `<ul class="participants-list">${details.participants.map(p => `<li class="participant-item"><span class="participant-email">${p}</span><button class="remove-participant" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(p)}" aria-label="Remove ${p}">✖</button></li>`).join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p class="schedule"><strong>Schedule:</strong> ${details.schedule}</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsHtml}
          </div>
        `;
        activityCard.setAttribute('data-activity-name', name);
        // store max participants on the DOM node for later updates
        activityCard.__maxParticipants = details.max_participants;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the newly-signed-up participant appears immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Event delegation for remove participant button
  activitiesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.remove-participant');
    if (!btn) return;

    const activity = decodeURIComponent(btn.dataset.activity);
    const email = decodeURIComponent(btn.dataset.email);

    if (!activity || !email) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await resp.json();

      if (resp.ok) {
        // remove the list item from DOM
        const li = btn.closest('.participant-item');
        if (li) li.remove();

        // update availability text
        const card = activitiesList.querySelector(`.activity-card[data-activity-name="${activity}"]`);
        if (card) {
          const max = Number(detailsForCard(card).maxParticipants || 0);
          const count = card.querySelectorAll('.participant-item').length;
          const spotsLeft = max - count;
          const avail = card.querySelector('.availability');
          if (avail) avail.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
          // if no participants left, show no-participants text
          const participantsList = card.querySelector('.participants-list');
          if (!participantsList || participantsList.children.length === 0) {
            const section = card.querySelector('.participants-section');
            if (section) section.querySelector('.no-participants') || section.insertAdjacentHTML('beforeend', '<p class="no-participants">No participants yet</p>');
          }
        }

        // Optionally show a temporary message (reuse messageDiv)
        messageDiv.textContent = result.message;
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 4000);
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
  });

  // Helper to read data attributes from card to get max participants
  function detailsForCard(card) {
    // Try to extract max participants from the global activities map if available
    // (we don't have direct access here), so parse from inner text fallback
    const schedule = card.querySelector('.schedule');
    // Fallback: return empty object
    return { maxParticipants: card.__maxParticipants };
  }
});
