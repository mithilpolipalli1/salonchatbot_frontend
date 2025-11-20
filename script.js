const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const menuButtonsEl = document.getElementById("menu-buttons");
const datePickerInput = document.getElementById("date-picker");

let step = "phone";
let phone = "";
let tempBooking = { services: [] };

// Add message to chat
function addMessage(text, sender) {
  const div = document.createElement("div");
  div.classList.add("bubble", sender);
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Send to backend
async function sendToServer(message) {
  const res = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message, step, phone, tempBooking }),
  });

  return res.json();
}

// Handle send
async function handleSend(text) {
  if (!text.trim()) return;

  addMessage(text, "user");
  inputEl.value = "";

  const data = await sendToServer(text);

  step = data.nextStep || step;
  phone = data.phone || phone;
  tempBooking = data.tempBooking || tempBooking;

  addMessage(data.reply, "bot");

  renderButtons();
}

// Render dynamic UI based on step
function renderButtons() {
  menuButtonsEl.innerHTML = "";

  // Main menu buttons
  if (step === "mainMenu") {
    const options = [
      { label: "📅 Book Appointment", value: "book" },
      { label: "👀 View Appointments", value: "view" },
      { label: "📌 Reschedule / Cancel", value: "modify" }
    ];

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "service-btn";
      btn.textContent = opt.label;
      btn.onclick = () => handleSend(opt.value);
      menuButtonsEl.appendChild(btn);
    });
  }

  // Multi-select services
  if (step === "bookService") {
    const services = ["Haircut", "Facial", "Shave", "Hair coloring", "Manicure"];

    services.forEach(service => {
      const btn = document.createElement("button");
      btn.className = "service-btn";
      btn.textContent = service;

      if (tempBooking.services?.includes(service)) {
        btn.classList.add("selected");
      }

      btn.onclick = () => {
        if (!tempBooking.services) tempBooking.services = [];

        if (tempBooking.services.includes(service)) {
          tempBooking.services = tempBooking.services.filter(s => s !== service);
          btn.classList.remove("selected");
        } else {
          tempBooking.services.push(service);
          btn.classList.add("selected");
        }
      };

      menuButtonsEl.appendChild(btn);
    });

    // DONE button
    const doneBtn = document.createElement("button");
    doneBtn.className = "service-btn";
    doneBtn.textContent = "✅ Done";
    doneBtn.onclick = () => {
      if (!tempBooking.services.length) {
        addMessage("❌ Please select at least one service.", "bot");
        return;
      }

      handleSend("__done_services__");
    };

    menuButtonsEl.appendChild(doneBtn);
  }

  // Time grid
  if (step === "bookTime") {
    const times = [
      "10AM","11AM","12PM",
      "1PM","2PM","3PM",
      "4PM","5PM","6PM",
      "7PM","8PM","9PM","10PM"
    ];

    const grid = document.createElement("div");
    grid.className = "time-grid";

    times.forEach(t => {
      const btn = document.createElement("button");
      btn.className = "time-btn";
      btn.textContent = t;
      btn.onclick = () => handleSend(t);
      grid.appendChild(btn);
    });

    menuButtonsEl.appendChild(grid);
  }

  // Date picker
  if (step === "bookDate") {
    const btn = document.createElement("button");
    btn.className = "service-btn";
    btn.textContent = "📆 Pick a date";
    btn.onclick = () => datePickerInput.click();
    menuButtonsEl.appendChild(btn);

    flatpickr(datePickerInput, {
      dateFormat: "d-m-Y",
      minDate: "today",
      maxDate: new Date(Date.now() + 30 * 86400000),
      onChange: (selectedDates, dateStr) => handleSend(dateStr)
    });
  }
}

// Events
sendBtn.onclick = () => handleSend(inputEl.value);
inputEl.addEventListener("keypress", e => {
  if (e.key === "Enter") handleSend(inputEl.value);
});

// Initial greeting
addMessage(
`Welcome to Mithil's Salon! ✂️

✨ Open 10 AM - 10 PM
✨ 10% OFF weekends
✨ First time users - 50% OFF

Enter your phone number to continue:`,
"bot"
);

renderButtons();
