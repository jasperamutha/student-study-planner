const API_URL = "/api/assignments";

/* ---------- DOM refs ---------- */
const form = document.getElementById("assignmentForm");
const idField = document.getElementById("assignmentId");
const subjectField = document.getElementById("subject");
const assignmentField = document.getElementById("assignment");
const deadlineField = document.getElementById("deadline");
const statusField = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const pendingList = document.getElementById("pendingList");
const completedList = document.getElementById("completedList");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");

const toast = document.getElementById("toast");

/* ---------- Helpers ---------- */
function showToast(msg, type = "success") {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => (toast.className = "toast"), 2500);
}

function formatDate(dateStr) {
  // dateStr is YYYY-MM-DD (from <input type="date">)
  if (!dateStr) return "No deadline";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Fetch & Render ---------- */
async function fetchAssignments() {
  const search = searchInput.value.trim();
  const status = statusFilter.value;

  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status && status !== "All") params.append("status", status);

  try {
    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load assignments");
    const data = await res.json();
    render(data);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function render(list) {
  pendingList.innerHTML = "";
  completedList.innerHTML = "";

  const pending = list.filter((a) => a.status !== "Completed");
  const completed = list.filter((a) => a.status === "Completed");

  pendingCount.textContent = pending.length;
  completedCount.textContent = completed.length;

  if (pending.length === 0) {
    pendingList.innerHTML = '<p class="empty">No pending assignments 🎉</p>';
  } else {
    pending.forEach((a) => pendingList.appendChild(createCard(a)));
  }

  if (completed.length === 0) {
    completedList.innerHTML = '<p class="empty">No completed assignments yet.</p>';
  } else {
    completed.forEach((a) => completedList.appendChild(createCard(a)));
  }
}

function createCard(a) {
  const div = document.createElement("div");
  div.className = `assignment-item ${a.status === "Completed" ? "completed" : ""}`;

  const statusClass =
    a.status === "Completed"
      ? "status-Completed"
      : a.status === "In Progress"
      ? "status-InProgress"
      : "status-Pending";

  div.innerHTML = `
    <div class="info">
      <div class="subject">${escapeHtml(a.subject)}</div>
      <div class="title">${escapeHtml(a.assignment)}</div>
      <div class="deadline">📅 Deadline: ${formatDate(a.deadline)}</div>
    </div>
    <span class="status-badge ${statusClass}">${escapeHtml(a.status)}</span>
    <div class="actions">
      <button class="btn-toggle" data-action="toggle" data-id="${a.id}" data-status="${a.status}">
        ${a.status === "Completed" ? "↩ Reopen" : "✓ Complete"}
      </button>
      <button class="btn-edit" data-action="edit" data-id="${a.id}">✎ Edit</button>
      <button class="btn-delete" data-action="delete" data-id="${a.id}">🗑 Delete</button>
    </div>
  `;
  return div;
}

/* ---------- Add / Update ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    subject: subjectField.value.trim(),
    assignment: assignmentField.value.trim(),
    deadline: deadlineField.value,
    status: statusField.value,
  };

  if (!payload.subject || !payload.assignment || !payload.deadline) {
    showToast("Please fill all fields", "error");
    return;
  }

  const editId = idField.value;
  const url = editId ? `${API_URL}/${editId}` : API_URL;
  const method = editId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Operation failed");
    }
    showToast(editId ? "Assignment updated ✅" : "Assignment added ✅");
    resetForm();
    fetchAssignments();
  } catch (err) {
    showToast(err.message, "error");
  }
});

function resetForm() {
  form.reset();
  idField.value = "";
  submitBtn.textContent = "Add Assignment";
  formTitle.textContent = "➕ Add New Assignment";
  cancelEditBtn.style.display = "none";
}

cancelEditBtn.addEventListener("click", resetForm);

/* ---------- Action buttons (delegate) ---------- */
document.querySelectorAll(".assignment-list").forEach((list) => {
  list.addEventListener("click", handleActionClick);
});

async function handleActionClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "delete") {
    if (!confirm("Delete this assignment?")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Assignment deleted 🗑");
      fetchAssignments();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (action === "toggle") {
    const current = btn.dataset.status;
    const newStatus = current === "Completed" ? "Pending" : "Completed";
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      showToast(`Marked as ${newStatus} ✅`);
      fetchAssignments();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (action === "edit") {
    await loadForEdit(id);
  }
}

async function loadForEdit(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("Could not load assignment");
    const a = await res.json();

    idField.value = a.id;
    subjectField.value = a.subject;
    assignmentField.value = a.assignment;
    deadlineField.value = a.deadline;
    statusField.value = a.status;

    submitBtn.textContent = "Update Assignment";
    formTitle.textContent = "✏️ Edit Assignment";
    cancelEditBtn.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ---------- Search & filter ---------- */
let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchAssignments, 300);
});
statusFilter.addEventListener("change", fetchAssignments);

/* ---------- Init ---------- */
fetchAssignments();