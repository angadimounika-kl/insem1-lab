const STORAGE_KEY = "smartHostelComplaints";

const form = document.getElementById("complaintForm");
const recordsBody = document.getElementById("recordsBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const categoryFilter = document.getElementById("categoryFilter");
const formMessage = document.getElementById("formMessage");

document.getElementById("today").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

function loadComplaints() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Unable to load complaint records:", error);
        return [];
    }
}

let complaints = loadComplaints();

function saveComplaints() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
        return true;
    } catch (error) {
        alert("Unable to save records. Browser storage may be full.");
        return false;
    }
}

// Generate unique complaint IDs.
function generateComplaintId() {
    let id;

    do {
        id = "HC" + Date.now().toString().slice(-8)
            + Math.floor(Math.random() * 90 + 10);
    } while (complaints.some(c => c.id === id));

    return id;
}

// Prevent user-entered text from becoming HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Submit a new complaint.
form.addEventListener("submit", function (event) {
    event.preventDefault();

    const complaint = {
        id: generateComplaintId(),
        studentName: document.getElementById("studentName").value.trim(),
        rollNumber: document.getElementById("rollNumber").value.trim(),
        roomNumber: document.getElementById("roomNumber").value.trim(),
        category: document.getElementById("category").value,
        priority: document.getElementById("priority").value,
        location: document.getElementById("location").value.trim(),
        description: document.getElementById("description").value.trim(),
        date: new Date().toLocaleDateString("en-IN"),
        status: "Pending"
    };

    if (
        !complaint.studentName ||
        !complaint.rollNumber ||
        !complaint.roomNumber ||
        !complaint.category ||
        !complaint.priority ||
        !complaint.location ||
        !complaint.description
    ) {
        formMessage.textContent = "Please fill in all required fields.";
        return;
    }

    complaints.unshift(complaint);

    if (!saveComplaints()) {
        complaints.shift();
        return;
    }

    form.reset();
    formMessage.textContent =
        "Complaint submitted successfully! ID: " + complaint.id;

    renderRecords();

    document.getElementById("records").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

// Update the dashboard totals.
function updateDashboard() {
    document.getElementById("totalCount").textContent =
        complaints.length;

    document.getElementById("pendingCount").textContent =
        complaints.filter(c => c.status === "Pending").length;

    document.getElementById("progressCount").textContent =
        complaints.filter(c => c.status === "In Progress").length;

    document.getElementById("resolvedCount").textContent =
        complaints.filter(c => c.status === "Resolved").length;
}

// Display all records that match the search and filters.
function renderRecords() {
    updateDashboard();

    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedCategory = categoryFilter.value;

    const filtered = complaints.filter(c => {
        const searchable = [
            c.id, c.studentName, c.rollNumber,
            c.roomNumber, c.category, c.location,
            c.description, c.priority, c.status
        ].join(" ").toLowerCase();

        return searchable.includes(query) &&
            (selectedStatus === "All" ||
                c.status === selectedStatus) &&
            (selectedCategory === "All" ||
                c.category === selectedCategory);
    });

    recordsBody.innerHTML = filtered.map(c => {
        const priorityClass = c.priority.toLowerCase();
        const statusOptions = ["Pending", "In Progress", "Resolved"]
            .map(status => `
                <option value="${status}"
                    ${c.status === status ? "selected" : ""}>
                    ${status}
                </option>
            `).join("");

        return `
            <tr>
                <td>${escapeHTML(c.id)}</td>

                <td>
                    <div class="student-detail">
                        <strong>${escapeHTML(c.studentName)}</strong>
                        <span>Roll: ${escapeHTML(c.rollNumber)}</span>
                        <span>Room: ${escapeHTML(c.roomNumber)}</span>
                    </div>
                </td>

                <td>
                    <strong>${escapeHTML(c.category)}</strong>
                    <br>
                    <span class="priority priority-${escapeHTML(priorityClass)}">
                        ${escapeHTML(c.priority)}
                    </span>
                </td>

                <td>
                    <strong>${escapeHTML(c.location)}</strong>
                    <p class="description-text">
                        ${escapeHTML(c.description)}
                    </p>
                </td>

                <td>${escapeHTML(c.date)}</td>

                <td>
                    <select class="status-select"
                        data-status-id="${escapeHTML(c.id)}"
                        aria-label="Update status for ${escapeHTML(c.id)}">
                        ${statusOptions}
                    </select>
                </td>

                <td>
                    <button type="button" class="delete-btn"
                        data-delete-id="${escapeHTML(c.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    emptyState.style.display = filtered.length === 0 ? "block" : "none";

    document.getElementById("recordCount").textContent =
        `Showing ${filtered.length} of ${complaints.length} records`;
}

// Search and filters update the table immediately.
searchInput.addEventListener("input", renderRecords);
statusFilter.addEventListener("change", renderRecords);
categoryFilter.addEventListener("change", renderRecords);

// Change complaint status.
recordsBody.addEventListener("change", function (event) {
    const id = event.target.dataset.statusId;
    if (!id) return;

    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;

    const oldStatus = complaint.status;
    complaint.status = event.target.value;

    if (!saveComplaints()) {
        complaint.status = oldStatus;
    }

    renderRecords();
});

// Delete one complaint.
recordsBody.addEventListener("click", function (event) {
    const id = event.target.dataset.deleteId;
    if (!id) return;

    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;

    if (!confirm(`Delete complaint ${id}? This cannot be undone.`)) {
        return;
    }

    const oldComplaints = complaints;
    complaints = complaints.filter(c => c.id !== id);

    if (!saveComplaints()) {
        complaints = oldComplaints;
        return;
    }

    renderRecords();
});

// Export all saved complaints as a CSV file.
document.getElementById("exportBtn").addEventListener("click", function () {
    if (complaints.length === 0) {
        alert("There are no complaint records to export.");
        return;
    }

    const headers = [
        "Complaint ID", "Student Name", "Roll Number",
        "Room Number", "Category", "Priority", "Location",
        "Description", "Date", "Status"
    ];

    const keys = [
        "id", "studentName", "rollNumber", "roomNumber",
        "category", "priority", "location", "description",
        "date", "status"
    ];

    function csvCell(value) {
        let text = String(value ?? "");

        // Prevent spreadsheet formula execution for untrusted text.
        if (/^[\s]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
    }

    const csv = [
        headers.map(csvCell).join(","),
        ...complaints.map(c =>
            keys.map(key => csvCell(c[key])).join(",")
        )
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "hostel_complaint_records.csv";
    link.click();

    URL.revokeObjectURL(url);
});

// Clear all records after confirmation.
document.getElementById("clearBtn").addEventListener("click", function () {
    if (complaints.length === 0) {
        alert("There are no records to clear.");
        return;
    }

    if (!confirm("Are you sure you want to delete ALL complaint records?")) {
        return;
    }

    const oldComplaints = complaints;
    complaints = [];

    if (!saveComplaints()) {
        complaints = oldComplaints;
        return;
    }

    renderRecords();
    formMessage.textContent = "";
});

// Show saved records when the page opens.
renderRecords();