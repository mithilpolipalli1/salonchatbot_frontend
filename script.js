const chatBody = document.getElementById("chat-body");
const inputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

// IMPORTANT: Salon chatbot → backend lives under /salon/api/chat
const API_URL = "/salon/api/chat";

let state = {
  step: "phone",
  phone: "",
  tempBooking: {}
};

// -----------------------------------------------------
// UI HELPERS
// -----------------------------------------------------
function addMessage(text, sender = "bot") {
  if (!text) return;

  const div = document.createElement("div");
  div.classList.add(sender === "bot" ? "bot-message" : "user-message");
  div.textContent = text;

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;

  return div;
}

function addOptionButton(text, value) {
  const btn = addMessage(text, "user");
  btn.style.cursor = "pointer";

  btn.addEventListener("click", () => {
    handleUserInput(value, true);
  });
}

// -----------------------------------------------------
// DATE PICKER
// -----------------------------------------------------
function setupDatePicker() {
  if (!window.flatpickr) return;

  if (inputEl._flatpickr) {
    inputEl._flatpickr.destroy();
  }

  inputEl.value = "";
  inputEl.placeholder = "Select date";

  const picker = flatpickr(inputEl, {
    dateFormat: "d-m-Y",
    minDate: "today",
    maxDate: new Date().fp_incr(30),
    onChange: (selected, dateStr) => {
      if (dateStr) {
        handleUserInput(dateStr);
        picker.destroy();
        inputEl.placeholder = "Type here...";
      }
    }
  });

  picker.open();
}

// -----------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------
async function handleUserInput(rawText, fromButton = false) {
  const text = (rawText || "").trim();
  if (!text) return;

  if (!fromButton) addMessage(text, "user");

  const payload = {
    text,
    step: state.step,
    phone: state.phone,
    tempBooking: state.tempBooking
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.reply) addMessage(data.reply);

    if (data.nextStep) state.step = data.nextStep;
    if (data.phone) state.phone = data.phone;
    if (data.tempBooking) state.tempBooking = data.tempBooking;

    if (Array.isArray(data.buttons)) {
      data.buttons.forEach(btn => {
        addOptionButton(btn.text, btn.value);
      });
    }

    if (state.step === "bookDate") {
      setupDatePicker();
    }

  } catch (err) {
    console.error(err);
    addMessage("⚠ Server Error. Try again.");
  }
}

// -----------------------------------------------------
// EVENTS
// -----------------------------------------------------
sendBtn.addEventListener("click", () => {
  const text = inputEl.value;
  inputEl.value = "";
  handleUserInput(text);
});

inputEl.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const text = inputEl.value;
    inputEl.value = "";
    handleUserInput(text);
  }
});

// -----------------------------------------------------
// FIRST MESSAGE
// -----------------------------------------------------
addMessage("Welcome to Mithil's Salon! 💈\nEnter your phone number to continue:");
