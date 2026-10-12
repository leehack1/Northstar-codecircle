const STORAGE_KEYS = {
  appointments: "northstarAppointments",
  messages: "northstarMessages",
  cart: "northstarCart",
  adminSession: "northstarAdminSession"
};

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Could not read ${key} from local storage.`, error);
    return [];
  }
}

function writeStoredList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not save ${key} to local storage.`, error);
    showToast("We couldn't save that just now. Please try again.");
    return false;
  }
}

function showToast(message) {
  const toast = document.querySelector("#site-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function initializeSharedUI() {
  const year = document.querySelector("#current-year");
  if (year) year.textContent = new Date().getFullYear();
}

function initializePublicSite() {
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-nav");

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      navigation.classList.toggle("is-open", !isOpen);
    });
    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
        navigation.classList.remove("is-open");
      }
    });
  }

  const appointmentDate = document.querySelector('#appointment-form input[name="date"]');
  if (appointmentDate) {
    const today = new Date();
    appointmentDate.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  document.querySelectorAll("[data-department]").forEach((card) => {
    card.addEventListener("click", () => {
      const select = document.querySelector('#appointment-form select[name="department"]');
      if (select) select.value = card.dataset.department;
    });
  });

  document.querySelectorAll(".doctor-arrow").forEach((button) => {
    button.addEventListener("click", () => {
      const doctorName = button.getAttribute("aria-label").replace("Book with ", "");
      sessionStorage.setItem("northstarPreferredDoctor", doctorName);
    });
  });

  document.querySelectorAll(".doctor-filters").forEach((filters) => {
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      filters.querySelectorAll("[data-filter]").forEach((filter) => filter.classList.toggle("is-selected", filter === button));
      const chosen = button.dataset.filter;
      document.querySelectorAll(".doctor-card").forEach((card) => {
        card.hidden = chosen !== "all" && card.dataset.specialty !== chosen;
      });
    });
  });

  const appointmentForm = document.querySelector("#appointment-form");
  if (appointmentForm) {
    appointmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const request = {
        id: crypto.randomUUID(),
        firstName: data.get("firstName").trim(),
        lastName: data.get("lastName").trim(),
        email: data.get("email").trim(),
        phone: data.get("phone").trim(),
        department: data.get("department"),
        date: data.get("date"),
        preferredDoctor: sessionStorage.getItem("northstarPreferredDoctor") || "",
        status: "pending",
        createdAt: new Date().toISOString()
      };
      const requests = readStoredList(STORAGE_KEYS.appointments);
      if (!writeStoredList(STORAGE_KEYS.appointments, [request, ...requests])) return;
      form.reset();
      sessionStorage.removeItem("northstarPreferredDoctor");
      document.querySelector("#appointment-message").textContent = "Thank you! Your request is in. Our care team will call or email you within one business day.";
    });
  }

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const message = {
        id: crypto.randomUUID(),
        name: data.get("name").trim(),
        email: data.get("email").trim(),
        topic: data.get("topic"),
        message: data.get("message").trim(),
        read: false,
        createdAt: new Date().toISOString()
      };
      if (!writeStoredList(STORAGE_KEYS.messages, [message, ...readStoredList(STORAGE_KEYS.messages)])) return;
      form.reset();
      document.querySelector("#contact-message").textContent = "Thanks for reaching out. Your message has been sent to our care team.";
    });
  }

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const cart = readStoredList(STORAGE_KEYS.cart);
      const existingItem = cart.find((item) => item.name === button.dataset.product);
      if (existingItem) existingItem.quantity += 1;
      else cart.push({ name: button.dataset.product, price: Number(button.dataset.price), quantity: 1 });
      if (writeStoredList(STORAGE_KEYS.cart, cart)) {
        renderCart();
        showToast(`${button.dataset.product} added to your bag.`);
      }
    });
  });
  renderCart();

  const currentPage = location.hash || "#home";
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === currentPage);
  });
  const sections = document.querySelectorAll("main section[id]");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll(".nav-link").forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
          });
        }
      });
    }, { rootMargin: "-25% 0px -65% 0px" });
    sections.forEach((section) => observer.observe(section));
  }
}

function renderCart() {
  const countElement = document.querySelector("#cart-count");
  const panel = document.querySelector("#cart-panel");
  if (!countElement || !panel) return;
  const cart = readStoredList(STORAGE_KEYS.cart);
  const quantity = cart.reduce((total, item) => total + item.quantity, 0);
  countElement.textContent = quantity;
  if (cart.length === 0) {
    panel.innerHTML = "";
    return;
  }
  const items = cart.map((item) => `<span>${escapeHTML(item.name)} × ${item.quantity}</span><strong>$${(item.price * item.quantity).toFixed(2)}</strong>`).join("");
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  panel.innerHTML = `<div class="cart-summary"><div class="cart-summary-heading"><strong>Your pharmacy bag</strong><button class="cart-clear" type="button">Clear bag</button></div>${items}<div class="cart-total"><strong>Pickup total</strong><strong>$${total.toFixed(2)}</strong></div><a class="button button-green cart-checkout" href="tel:+15550148300">Call to arrange pickup ↗</a><small>Pickup is arranged with the pharmacy team; no online payment is collected.</small></div>`;
  panel.querySelector(".cart-clear").addEventListener("click", () => {
    if (writeStoredList(STORAGE_KEYS.cart, [])) renderCart();
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function initializeAdmin() {
  const loginForm = document.querySelector("#admin-login-form");
  if (!loginForm) return;

  const loginPanel = document.querySelector("#admin-login");
  const dashboard = document.querySelector("#admin-dashboard");
  const logoutButton = document.querySelector(".admin-logout");

  function setAuthenticated(authenticated) {
    loginPanel.hidden = authenticated;
    dashboard.hidden = !authenticated;
    logoutButton.hidden = !authenticated;
    if (authenticated) renderAdminDashboard();
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const passcode = new FormData(loginForm).get("passcode");
    if (passcode !== "246810") {
      document.querySelector("#login-message").textContent = "That access code isn't correct. Please try again.";
      return;
    }
    sessionStorage.setItem(STORAGE_KEYS.adminSession, "authenticated");
    loginForm.reset();
    setAuthenticated(true);
  });

  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEYS.adminSession);
    setAuthenticated(false);
  });

  document.querySelector("#appointment-status-filter").addEventListener("change", renderAdminAppointments);
  document.querySelector("#admin-appointments").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const appointments = readStoredList(STORAGE_KEYS.appointments);
    const appointment = appointments.find((item) => item.id === button.dataset.id);
    if (!appointment) return;
    if (button.dataset.action === "delete") {
      if (!window.confirm("Remove this appointment request from this browser?")) return;
      if (!writeStoredList(STORAGE_KEYS.appointments, appointments.filter((item) => item.id !== appointment.id))) return;
    } else if (button.dataset.action === "status") {
      appointment.status = button.dataset.status;
      if (!writeStoredList(STORAGE_KEYS.appointments, appointments)) return;
    }
    renderAdminDashboard();
  });

  document.querySelector("#admin-messages").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='read']");
    if (!button) return;
    const messages = readStoredList(STORAGE_KEYS.messages);
    const message = messages.find((item) => item.id === button.dataset.id);
    if (!message) return;
    message.read = true;
    if (writeStoredList(STORAGE_KEYS.messages, messages)) renderAdminDashboard();
  });

  setAuthenticated(sessionStorage.getItem(STORAGE_KEYS.adminSession) === "authenticated");
}

function renderAdminDashboard() {
  const appointments = readStoredList(STORAGE_KEYS.appointments);
  const messages = readStoredList(STORAGE_KEYS.messages);
  const pending = appointments.filter((appointment) => appointment.status === "pending").length;
  const open = appointments.filter((appointment) => appointment.status !== "cancelled").length;
  const unread = messages.filter((message) => !message.read).length;
  document.querySelector("#admin-stat-appointments").textContent = appointments.length;
  document.querySelector("#admin-stat-open").textContent = open;
  document.querySelector("#admin-stat-messages").textContent = messages.length;
  document.querySelector("#admin-pending-label").textContent = `${pending} awaiting review`;
  document.querySelector("#admin-unread-label").textContent = `${unread} unread`;
  renderAdminAppointments();
  renderAdminMessages();
}

function renderAdminAppointments() {
  const target = document.querySelector("#admin-appointments");
  if (!target) return;
  const filter = document.querySelector("#appointment-status-filter").value;
  const appointments = readStoredList(STORAGE_KEYS.appointments)
    .filter((appointment) => filter === "all" || appointment.status === filter);
  if (appointments.length === 0) {
    target.innerHTML = '<tr><td colspan="6" class="admin-empty">No requests match this view yet.</td></tr>';
    return;
  }
  target.innerHTML = appointments.map((appointment) => {
    const date = new Date(`${appointment.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const nextStatus = appointment.status === "pending" ? "confirmed" : appointment.status === "confirmed" ? "cancelled" : "pending";
    const nextLabel = appointment.status === "pending" ? "Confirm" : appointment.status === "confirmed" ? "Cancel" : "Reopen";
    return `<tr><td><strong>${escapeHTML(appointment.firstName)} ${escapeHTML(appointment.lastName)}</strong><small>${escapeHTML(appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString() : "")}</small></td><td>${escapeHTML(appointment.department)}</td><td>${escapeHTML(date)}</td><td><a href="mailto:${encodeURIComponent(appointment.email)}">${escapeHTML(appointment.email)}</a><small>${escapeHTML(appointment.phone)}</small></td><td><span class="status-pill status-${escapeHTML(appointment.status)}">${escapeHTML(appointment.status)}</span></td><td><div class="admin-actions"><button type="button" data-action="status" data-status="${nextStatus}" data-id="${escapeHTML(appointment.id)}">${nextLabel}</button><button class="admin-delete" type="button" data-action="delete" data-id="${escapeHTML(appointment.id)}">Remove</button></div></td></tr>`;
  }).join("");
}

function renderAdminMessages() {
  const target = document.querySelector("#admin-messages");
  if (!target) return;
  const messages = readStoredList(STORAGE_KEYS.messages);
  if (messages.length === 0) {
    target.innerHTML = '<div class="admin-empty">No messages yet. Contact form submissions will appear here.</div>';
    return;
  }
  target.innerHTML = messages.map((message) => `<article class="admin-message${message.read ? "" : " is-unread"}"><div class="admin-message-top"><strong>${escapeHTML(message.name)}</strong><span>${escapeHTML(message.topic)}</span></div><a href="mailto:${encodeURIComponent(message.email)}">${escapeHTML(message.email)}</a><p>${escapeHTML(message.message)}</p><div class="admin-message-bottom"><small>${escapeHTML(message.createdAt ? new Date(message.createdAt).toLocaleString() : "")}</small>${message.read ? '<span class="message-read-label">Read</span>' : `<button type="button" data-action="read" data-id="${escapeHTML(message.id)}">Mark read</button>`}</div></article>`).join("");
}

initializeSharedUI();
initializePublicSite();
initializeAdmin();
