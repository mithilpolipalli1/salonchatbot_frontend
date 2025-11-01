document.addEventListener("DOMContentLoaded", () => {

    // --- CONFIGURATION ---
    // !!! IMPORTANT: Change this to your 10-digit phone number !!!
    const ADMIN_PHONE_NUMBER = "9876543210"; // This is now your admin "login"
    // --- END CONFIGURATION ---

    // Get DOM elements
    const chatbotContainer = document.getElementById("chatbot-container");
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const quickRepliesContainer = document.getElementById("quick-replies");
    const typingIndicator = document.getElementById("typing-indicator");
    const togglePasswordBtn = document.getElementById("toggle-password");
    const inputWrapper = document.querySelector(".input-wrapper");
    const calendarModal = document.getElementById("calendar-modal");
    const monthYearDisplay = document.getElementById("month-year");
    const calendarDatesContainer = document.getElementById("calendar-dates");
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const closeCalendarBtn = document.getElementById("close-calendar");
    const inputArea = document.getElementById("input-area");
    // const loginChoiceScreen = document.getElementById("login-choice-screen"); // No longer needed
    const adminDashboard = document.getElementById("admin-dashboard");
    const appointmentListDiv = document.getElementById("appointment-list");
    const adminLogoutBtn = document.getElementById("admin-logout-btn");

    // State variables
    let currentUser = null; 
    let tempUserData = {};
    let conversationState = "auth_ask_phone"; // Start by asking for phone
    let bookingDetails = {};
    let currentCalendarDate = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 2);
    let adminRefreshInterval = null;

    // Salon Data
    const locations = ["Miyapur", "Gachibowli", "Jubilee Hills"];
    const services = [
        { name: "Haircut", price: 500.00, value: "haircut" }, { name: "Hair Coloring", price: 800.00, value: "hair coloring" },
        { name: "Facial", price: 400.00, value: "facial" }, { name: "Manicure", price: 300.00, value: "manicure" },
        { name: "Pedicure", price: 350.00, value: "pedicure" }, { name: "Spa Treatment", price: 1000.00, value: "spa treatment" },
    ];
    const priceList = { 'combo: haircut + facial': 800.00, 'combo: manicure + pedicure': 600.00 };
    const allTimeSlots = ["10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"];
    
    // Customer Menu
    const mainMenuOptions = [
        { text: "Book an Appointment 📅", value: "book" }, { text: "View My Appointments 🗓️", value: "view_appointments"},
        { text: "Our Services 💇", value: "services" }, { text: "Our Locations 📍", value: "locations" },
        { text: "Cancel Appointment 🚫", value: "cancel" }, { text: "Log Out 🚪", value: "logout" }
    ];
    
    // Admin Menu
    const adminMenuOptions = [
        { text: "View All Appointments 📋", value: "admin_view_all" },
        { text: "View by Location 📍", value: "admin_view_location" },
        { text: "Log Out 🚪", value: "logout" } 
    ];

    // --- Core Functions ---
    function showTyping(show) { typingIndicator.style.display = show ? "block" : "none"; if (show) chatMessages.scrollTop = chatMessages.scrollHeight; }
    function addMessage(text, sender) { const messageElement = document.createElement("div"); messageElement.classList.add("message", sender); messageElement.textContent = text; chatMessages.insertBefore(messageElement, typingIndicator); chatMessages.scrollTop = chatMessages.scrollHeight; }
    function clearChat() { chatMessages.innerHTML = ""; chatMessages.appendChild(typingIndicator); }
    function setInputMode(isPassword, placeholder = "Type your message...") { 
        userInput.type = "text"; 
        togglePasswordBtn.style.display = "none"; 
        userInput.placeholder = placeholder; 
    }
    function showQuickReplies(options, multiSelect = false, showBackButton = false) {
        quickRepliesContainer.innerHTML = "";
        if (options.length === 0) { inputWrapper.classList.remove("hidden"); userInput.classList.remove("hidden"); sendBtn.classList.remove("hidden"); userInput.focus(); }
        else { setInputMode(false); inputWrapper.classList.add("hidden"); userInput.classList.add("hidden"); sendBtn.classList.add("hidden"); }
        options.forEach(option => { const button = document.createElement("button"); button.classList.add("quick-btn"); if (multiSelect) button.classList.add("multi-select"); button.textContent = option.text; button.dataset.value = option.value; quickRepliesContainer.appendChild(button); });
        if (multiSelect) { const confirmButton = document.createElement("button"); confirmButton.classList.add("quick-btn", "confirm-select"); confirmButton.textContent = "Confirm Selection"; quickRepliesContainer.appendChild(confirmButton); }
        if (showBackButton) { const backButton = document.createElement("button"); backButton.classList.add("quick-btn", "back-btn"); backButton.textContent = "⬅️ Go Back"; backButton.dataset.value = "_back_"; quickRepliesContainer.appendChild(backButton); }
    }
    function botResponse(text, options = [], multiSelect = false, showBackButton = false) { showTyping(true); setTimeout(() => { showTyping(false); addMessage(text, "bot"); showQuickReplies(options, multiSelect, showBackButton); }, 600 + Math.random() * 400); }

    // --- Date/Time Helpers ---
    function getNextSevenDays() { const days = []; const today = new Date(); const options = { weekday: 'short', month: 'short', day: 'numeric' }; for (let i = 0; i < 7; i++) { const date = new Date(today); date.setDate(today.getDate() + i); let text; if (i === 0) text = `Today, ${date.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`; else if (i === 1) text = `Tomorrow, ${date.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`; else text = date.toLocaleString('en-US', options); const value = date.toISOString().split('T')[0]; days.push({ text, value }); } return days; }
    function getAvailableTimeSlots(selectedDate) { function parseTime(timeStr) { const [time, modifier] = timeStr.split(' '); let [hours] = time.split(':'); hours = parseInt(hours); if (modifier === 'PM' && hours !== 12) hours += 12; if (modifier === 'AM' && hours === 12) hours = 0; return hours; } const today = new Date().toISOString().split('T')[0]; if (selectedDate !== today) return allTimeSlots; const currentHour = new Date().getHours(); return allTimeSlots.filter(slot => parseTime(slot) > currentHour); }

    // --- Calendar Functions ---
    function renderCalendar(year, month) {
        currentCalendarDate.setFullYear(year, month);
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`; calendarDatesContainer.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        prevMonthBtn.disabled = (year === today.getFullYear() && month === today.getMonth());
        nextMonthBtn.disabled = (year === maxDate.getFullYear() && month === maxDate.getMonth());
        for (let i = 0; i < firstDayOfMonth; i++) { const emptyDiv = document.createElement('div'); emptyDiv.classList.add('empty-day'); calendarDatesContainer.appendChild(emptyDiv); }
        for (let day = 1; day <= daysInMonth; day++) { const dateButton = document.createElement('button'); const currentDate = new Date(year, month, day); currentDate.setHours(0, 0, 0, 0); dateButton.textContent = day; dateButton.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; if (currentDate < today || currentDate > maxDate) dateButton.disabled = true; if (currentDate.getTime() === today.getTime() && !dateButton.disabled) dateButton.classList.add('today'); calendarDatesContainer.appendChild(dateButton); }
    }
    function showCalendar() { renderCalendar(today.getFullYear(), today.getMonth()); calendarModal.style.display = 'flex'; }
    function hideCalendar() { calendarModal.style.display = 'none'; }

     // --- UI Visibility Functions ---
    function showChatInterface() {
        chatbotContainer.style.display = 'flex';
        adminDashboard.style.display = 'none';
        if (adminRefreshInterval) clearInterval(adminRefreshInterval);
    }
    function showAdminInterface() {
        chatbotContainer.style.display = 'none';
        adminDashboard.style.display = 'flex';
        loadAllAppointments();
        if (adminRefreshInterval) clearInterval(adminRefreshInterval);
        adminRefreshInterval = setInterval(loadAllAppointments, 10000);
    }

    // --- Main Logic ---
    function processMessage(message) { 
        if (message === '_back_') { handleBackButton(); return; } 
        const userMessage = (typeof message === 'string') ? message.toLowerCase().trim() : ''; 
        
        switch (conversationState) { 
            case "auth_ask_phone": handleAuthPhone(userMessage); break; 
            case "auth_ask_name": handleRegisterName(userMessage); break;
            
            case "initial": handleMainMenu(userMessage); break; 
            case "booking_service": handleBookingService(message); break; 
            case "booking_location": handleBookingLocation(userMessage); break; 
            case "booking_date": handleBookingDate(userMessage); break; 
            case "booking_time": handleBookingTime(userMessage); break; 
            case "cancellation_start": handleCancellationStart(); break; 
            case "cancellation_select": handleCancellationSelect(userMessage); break; 
            case "view_appointments": handleViewAppointments(); break;

            case "admin_initial": handleAdminMenu(userMessage); break;
            case "admin_view_location": handleAdminLocationChoice(userMessage); break;
        } 
    }
    
    function handleBackButton() {
        addMessage("⬅️ Go Back", "user");
        if (conversationState === 'auth_ask_name') {
            startBotFlow(); 
            return;
        }
        if (conversationState === 'admin_view_location') {
            conversationState = 'admin_initial';
            botResponse("Okay, back to the admin menu.", adminMenuOptions);
            return;
        }
        switch(conversationState) {
            case 'booking_service': conversationState = 'initial'; botResponse("Okay, how can I help?", mainMenuOptions); break;
            case 'booking_location': conversationState = 'booking_service'; const serviceOptions = services.map(s => ({ text: `${s.name} - ₹${s.price.toFixed(2)}`, value: s.value })); botResponse("Okay, re-select services:", serviceOptions, true, true); break;
            case 'booking_date': hideCalendar(); conversationState = 'booking_location'; const locationOptions = locations.map(l => ({ text: l, value: l.toLowerCase() })); botResponse("Okay, which location?", locationOptions, false, true); break;
            case 'booking_time': conversationState = 'booking_date'; botResponse("Okay, select a different date."); setTimeout(showCalendar, 300); break;
            case 'cancellation_select': conversationState = 'initial'; botResponse("Okay, back to the main menu.", mainMenuOptions); break;
            default: 
                if (currentUser && currentUser.isAdmin) {
                    conversationState = 'admin_initial';
                    botResponse("Going back to the admin menu.", adminMenuOptions);
                } else if (currentUser) {
                    conversationState = 'initial';
                    botResponse("Going back to the main menu.", mainMenuOptions);
                } else {
                    startBotFlow();
                }
                break; 
        }
    }

    // --- Auth Handlers (WhatsApp Style) ---
    async function handleAuthPhone(phone) { 
        if (!/^\d{10}$/.test(phone.replace(/\s+/g, ''))) { 
            botResponse("Valid 10-digit phone number needed.", [], false, false); 
            setInputMode(false, "Enter phone number..."); 
            return; 
        } 
        
        if (phone === ADMIN_PHONE_NUMBER) {
            currentUser = { phone: phone, name: "Admin", isAdmin: true };
            conversationState = "admin_initial";
            botResponse("Welcome, Admin! What would you like to do today?", adminMenuOptions);
            return;
        }

        tempUserData = { phone: phone }; 
        try { 
            const response = await fetch('http://localhost:3000/check-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone }) }); 
            const data = await response.json(); 
            
            if (data.exists) { 
                currentUser = { phone: phone, name: data.name, isAdmin: false };
                conversationState = "initial"; 
                botResponse(`Welcome back, ${data.name}! ✂️ How can I help?`, mainMenuOptions); 
                setInputMode(false, "Type your message..."); 
            } else { 
                conversationState = "auth_ask_name"; 
                botResponse("Welcome to Mithil's Salon! 🙏\nIt looks like you're new here (First-timers get 50% off!).\n\nWhat's your full name?", [], false, true); 
                setInputMode(false, "Enter your full name..."); 
            } 
        } catch (err) { 
            console.error("Fetch Error:", err); 
            botResponse("Connection error. Ensure server is running & try again.", [], false, false); 
        } 
    }
    
    async function handleRegisterName(name) { 
        if (name.length < 2) { 
            botResponse("Enter a valid full name.", [], false, true); 
            setInputMode(false, "Enter your full name..."); 
            return; 
        } 
        tempUserData.name = name; 
        
        try { 
            const response = await fetch('http://localhost:3000/register', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    phone: tempUserData.phone, 
                    name: tempUserData.name, 
                    password: "whatsapp_user" // Send default password
                }) 
            }); 
            const data = await response.json(); 
            if (data.success) { 
                currentUser = data.user;
                currentUser.isAdmin = false;
                conversationState = "initial"; 
                botResponse(`Thanks, ${currentUser.name}! You're all set. Your 50% discount will be applied to your first booking!\n\nHow can I help you today?`, mainMenuOptions); 
                setInputMode(false); 
            } else { 
                botResponse("Registration failed...", [], false, true); 
                setTimeout(startBotFlow, 1000); 
            } 
        } catch (err) { 
            console.error("Fetch Error:", err); 
            botResponse("Connection error...", [], false, true); 
        } 
    }
    
    // --- Admin Menu Handler ---
    function handleAdminMenu(message) {
        if (message === "admin_view_all") {
            showAdminInterface();
            conversationState = "admin_initial";
        } else if (message === "admin_view_location") {
            conversationState = "admin_view_location";
            const locationOptions = locations.map(l => ({ text: l, value: l.toLowerCase() }));
            botResponse("Which location do you want to see?", locationOptions, false, true); 
        } else if (message === "logout") {
            botResponse("Logging out, Admin.", []);
            currentUser = null;
            setTimeout(() => {
                showChatInterface(); 
                startBotFlow(); 
            }, 1000);
        } else {
            botResponse("Invalid admin command.", adminMenuOptions);
        }
    }

    // --- Admin Location Choice Handler ---
    async function handleAdminLocationChoice(location) {
        if (!locations.map(l => l.toLowerCase()).includes(location)) {
            botResponse("Invalid location. Please choose from the list.", adminMenuOptions);
            conversationState = "admin_initial"; 
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/get-all-appointments');
            const data = await response.json();
            if (!data.success) {
                botResponse("Error fetching appointments.", adminMenuOptions);
                conversationState = "admin_initial";
                return;
            }
            const filteredAppointments = data.appointments.filter(apt => apt.location === location && apt.status === 'booked');
            let appointmentMessage = `Upcoming Bookings for ${location.charAt(0).toUpperCase() + location.slice(1)}:\n--------------------\n`;
            if (filteredAppointments.length > 0) {
                 filteredAppointments.forEach(apt => {
                     let displayDate = "Invalid Date";
                     if (apt.appointment_date) {
                        const dateObj = new Date(apt.appointment_date.replace(/-/g, '/'));
                        if (!isNaN(dateObj.getTime())) { displayDate = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric'}); }
                     }
                     let priceString = (apt.total_price !== null && !isNaN(parseFloat(apt.total_price))) ? `₹${parseFloat(apt.total_price).toFixed(2)}` : 'N/A';
                     appointmentMessage += `🔹 **Cust:** ${apt.customer_name} (${apt.user_phone})\n   **Svc:** ${apt.services}\n   **When:** ${displayDate} at ${apt.appointment_time}\n   **Price:** ${priceString}\n--------------------\n`;
                 });
            } else {
                appointmentMessage = `No upcoming appointments found for ${location}.`;
            }
            botResponse(appointmentMessage, adminMenuOptions);
            conversationState = "admin_initial"; 
        } catch (err) {
            console.error("Fetch Error:", err);
            botResponse("Connection error.", adminMenuOptions);
            conversationState = "admin_initial";
        }
    }
    
    // --- Main Menu Handler ---
    function handleMainMenu(message) { 
        if (message === "book") { conversationState = "booking_service"; bookingDetails = {}; const serviceOptions = services.map(s => ({ text: `${s.name} - ₹${s.price.toFixed(2)}`, value: s.value })); botResponse("Great! Select services:", serviceOptions, true, true); } 
        else if (message === "view_appointments") { conversationState = "view_appointments"; botResponse("Fetching appointments...", []); setTimeout(handleViewAppointments, 500); } 
        else if (message === "services") { const serviceList = services.map(s => `• ${s.name} - ₹${s.price.toFixed(2)}`).join('\n'); const comboInfo = `\nCombo Offers:\n• Haircut + Facial: ₹${priceList['combo: haircut + facial']?.toFixed(2)}\n• Manicure + Pedicure: ₹${priceList['combo: manicure + pedicure']?.toFixed(2)}\n\nWeekend Offer: 10% off!\nFirst-Timer: 50% off!`; botResponse(`Services:\n${serviceList}${comboInfo}`, mainMenuOptions); } 
        else if (message === "locations") { const locationList = "• Miyapur: Near metro.\n• Gachibowli: Financial District.\n• Jubilee Hills: Road No. 36."; botResponse(`Locations:\n${locationList}`, mainMenuOptions); } 
        else if (message === "cancel") { conversationState = "cancellation_start"; botResponse("Checking appointments...", []); setTimeout(handleCancellationStart, 500); } 
        else if (message === "logout") { 
            botResponse(`Okay, logging out.`, []); 
            currentUser = null; 
            setTimeout(() => { 
                clearChat(); 
                startBotFlow(); 
            }, 1500); 
        } else { botResponse("Didn't understand. Choose option.", mainMenuOptions); } 
    }

    // --- Booking Handlers ---
    function handleBookingService(selectedServiceValues) { if (!Array.isArray(selectedServiceValues) || selectedServiceValues.length === 0) { const serviceOptions = services.map(s => ({ text: `${s.name} - ₹${s.price.toFixed(2)}`, value: s.value })); botResponse("Select at least one service.", serviceOptions, true, true); return; } bookingDetails.services = selectedServiceValues; conversationState = "booking_location"; const locationOptions = locations.map(l => ({ text: l, value: l.toLowerCase() })); botResponse("Got it. Location?", locationOptions, false, true); }
    function handleBookingLocation(location) { if (!locations.map(l => l.toLowerCase()).includes(location)) { const locationOptions = locations.map(l => ({ text: l, value: l.toLowerCase() })); botResponse("Select a valid location.", locationOptions, false, true); return; } bookingDetails.location = location; conversationState = "booking_date"; botResponse("Perfect. Select a date using the calendar:"); setTimeout(showCalendar, 300); }
    function handleBookingDate(dateValue) { bookingDetails.date = dateValue; conversationState = "booking_time"; const timeSlots = getAvailableTimeSlots(dateValue); if (timeSlots.length === 0) { botResponse("No slots for that date. Pick another.", [], false, true); setTimeout(showCalendar, 300); conversationState = "booking_date"; return; } const timeOptions = timeSlots.map(t => ({ text: t, value: t })); botResponse("What time?", timeOptions, false, true); }
    function handleBookingTime(time) { bookingDetails.time = time; botResponse("Confirming details & calculating price...", []); setTimeout(handleBookingConfirmation, 1000); }
    async function handleBookingConfirmation() { let priceDetailsFromServer = null; try { const response = await fetch('http://localhost:3000/book-appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_phone: currentUser.phone, services: bookingDetails.services, location: bookingDetails.location, date: bookingDetails.date, time: bookingDetails.time }) }); const data = await response.json(); if (!data.success) { botResponse("Booking failed, try again.", mainMenuOptions); conversationState = "initial"; return; } priceDetailsFromServer = data.priceDetails; } catch (err) { console.error("Fetch Error:", err); botResponse("Booking system connection error...", mainMenuOptions); conversationState = "initial"; return; } bookingDetails.name = currentUser.name; bookingDetails.phone = currentUser.phone; conversationState = "initial"; const dateObj = new Date(bookingDetails.date.replace(/-/g, '/')); const displayDate = dateObj.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); let priceText = `Total Price: ₹${priceDetailsFromServer.totalPrice.toFixed(2)}`; if (priceDetailsFromServer.firstBookingOfferApplied) { priceText += " (50% First-Timer Offer Applied!)"; } else if (priceDetailsFromServer.offerApplied) { priceText += " (Weekend Offer Applied!)"; } const displayServices = bookingDetails.services.map(value => { const serviceObj = services.find(s => s.value === value); return serviceObj ? serviceObj.name : value; }).join(', '); const confirmationText = `✨ All set! Confirmation:\n--------------------------------\nName: ${bookingDetails.name}\nPhone: ${bookingDetails.phone}\nService(s): ${displayServices}\nLocation: ${bookingDetails.location}\nDate: ${displayDate}\nTime: ${bookingDetails.time}\n${priceText}\n--------------------------------\nSee you!`; botResponse(confirmationText, mainMenuOptions); bookingDetails = {}; }

    // --- (FIXED) Cancellation Handlers ---
    async function handleCancellationStart() {
        try { const response = await fetch('http://localhost:3000/get-appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_phone: currentUser.phone }) }); const data = await response.json();
            if (data.success && data.appointments.length > 0) {
                const appointmentOptions = data.appointments.map(apt => {
                    let displayDate = "Unknown Date"; // Default
                    if (apt.appointment_date) { // Check if date is not null
                        const aptDate = new Date(apt.appointment_date.replace(/-/g, '/'));
                        if (!isNaN(aptDate.getTime())) { // Check if date is valid
                            displayDate = aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); 
                        }
                    }
                    return { text: `${apt.services} on ${displayDate} at ${apt.appointment_time}`, value: apt.appointment_id };
                });
                botResponse("Which appointment to cancel?", appointmentOptions, false, true);
                conversationState = "cancellation_select";
            } else { botResponse("No active appointments found.", mainMenuOptions); conversationState = "initial"; }
        } catch (err) { console.error("Fetch Error:", err); botResponse("Error fetching appointments...", mainMenuOptions); conversationState = "initial"; }
    }
    async function handleCancellationSelect(appointment_id) { try { const response = await fetch('http://localhost:3000/cancel-appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointment_id: appointment_id }) }); const data = await response.json(); if (data.success) botResponse("Appointment cancelled. How else can I help?", mainMenuOptions); else botResponse("Cancellation failed, try again.", mainMenuOptions); } catch (err) { console.error("Fetch Error:", err); botResponse("Connection error during cancellation...", mainMenuOptions); } conversationState = "initial"; }

    // --- (FIXED) View Appointments Handler ---
     async function handleViewAppointments() {
         if (!currentUser || currentUser.isAdmin) { botResponse("Error. Please log in again.", []); showLoginChoice(); return; }
         try { const response = await fetch('http://localhost:3000/get-appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_phone: currentUser.phone }) }); const data = await response.json();
             let appointmentMessage = "Upcoming Appointments:\n--------------------\n";
             if (data.success && data.appointments.length > 0) {
                 data.appointments.forEach(apt => {
                     let displayDate = "Unknown Date"; // Default
                     if (apt.appointment_date) { // Check if date is not null
                        const dateObj = new Date(apt.appointment_date.replace(/-/g, '/'));
                        if (!isNaN(dateObj.getTime())) { // Check if date is valid
                            displayDate = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); 
                        }
                     }
                     const priceString = (apt.total_price !== null && !isNaN(parseFloat(apt.total_price))) ? `₹${parseFloat(apt.total_price).toFixed(2)}` : 'N/A';
                     appointmentMessage += `🔹 Services: ${apt.services}\n📍 Location: ${apt.location}\n📅 Date: ${displayDate}\n🕒 Time: ${apt.appointment_time}\n💰 Price: ${priceString}\n--------------------\n`; });
             } else if (data.success) { appointmentMessage = "No upcoming appointments found."; }
             else { appointmentMessage = "Couldn't retrieve appointments."; }
             botResponse(appointmentMessage, mainMenuOptions);
         } catch (err) { console.error("Fetch Error:", err); botResponse("Connection error fetching appointments.", mainMenuOptions); }
         conversationState = "initial";
     }

     // --- (FIXED) Admin Function ---
    async function loadAllAppointments() {
        appointmentListDiv.innerHTML = '<p>Loading appointments...</p>';
        try { const response = await fetch('http://localhost:3000/get-all-appointments'); const data = await response.json();
            if (data.success && data.appointments.length > 0) {
                appointmentListDiv.innerHTML = '';
                const appointmentsByLocation = data.appointments.reduce((acc, apt) => { const location = apt.location || 'Unknown'; if (!acc[location]) acc[location] = []; acc[location].push(apt); return acc; }, {});
                 for (const location in appointmentsByLocation) {
                     const locationHeader = document.createElement('h4'); locationHeader.textContent = `📍 ${location.charAt(0).toUpperCase() + location.slice(1)}`;
                     appointmentListDiv.appendChild(locationHeader);
                     appointmentsByLocation[location].forEach(apt => {
                         const aptDiv = document.createElement('div'); aptDiv.classList.add('appointment-item');
                         let displayDate = "Unknown Date"; // Default
                         if (apt.appointment_date) { // Check if date is not null
                            const dateObj = new Date(apt.appointment_date.replace(/-/g, '/'));
                            if (!isNaN(dateObj.getTime())) { // Check if date is valid
                                displayDate = dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric'});
                            }
                         }
                         let priceString = 'N/A'; if (apt.total_price !== null && !isNaN(parseFloat(apt.total_price))) { priceString = `₹${parseFloat(apt.total_price).toFixed(2)}`; }
                         aptDiv.innerHTML = `<p><strong>Customer:</strong> ${apt.customer_name} (${apt.user_phone})</p><p><strong>Services:</strong> ${apt.services}</p><p><strong>Date & Time:</strong> ${displayDate} at ${apt.appointment_time}</p><p><strong>Price:</strong> ${priceString}</p><p><strong>Status:</strong> ${apt.status}</p>`;
                         appointmentListDiv.appendChild(aptDiv);
                     });
                 }
            } else if (data.success) { appointmentListDiv.innerHTML = '<p>No appointments found.</p>'; }
            else { appointmentListDiv.innerHTML = '<p>Error loading appointments.</p>'; }
        } catch (err) { console.error("Fetch Error:", err); appointmentListDiv.innerHTML = '<p>Could not connect to server.</p>'; }
    }

    // --- Event Listeners ---
    quickRepliesContainer.addEventListener("click", (e) => { const btn = e.target; if (btn.dataset.value === '_back_') { processMessage('_back_'); return; } if (btn.classList.contains("multi-select")) { btn.classList.toggle("active"); return; } if (btn.classList.contains("confirm-select")) { const activeBtns = quickRepliesContainer.querySelectorAll('.multi-select.active'); const selectedServiceValues = Array.from(activeBtns).map(b => b.dataset.value); const selectedServiceNames = selectedServiceValues.map(value => { const serviceObj = services.find(s => s.value === value); return serviceObj ? serviceObj.name : value; }).join(', '); if (selectedServiceValues.length === 0) { const serviceOptions = services.map(s => ({ text: `${s.name} - ₹${s.price.toFixed(2)}`, value: s.value })); botResponse("Select at least one service.", [], false, true); showQuickReplies(serviceOptions, true, true); return; } addMessage(`Selected: ${selectedServiceNames}`, "user"); processMessage(selectedServiceValues); return; } if (btn.classList.contains("quick-btn")) { const message = btn.dataset.value; const messageText = btn.textContent; addMessage(messageText, "user"); processMessage(message); } });
    sendBtn.addEventListener("click", () => { const message = userInput.value.trim(); if (message) { addMessage(message, "user"); userInput.value = ""; processMessage(message); } });
    userInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { sendBtn.click(); } });
    togglePasswordBtn.addEventListener("click", () => { /* ... */ });
    prevMonthBtn.addEventListener("click", () => { renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1); });
    nextMonthBtn.addEventListener("click", () => { renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1); });
    closeCalendarBtn.addEventListener("click", () => { hideCalendar(); if (conversationState === "booking_date") handleBackButton(); });
    calendarDatesContainer.addEventListener("click", (e) => { if (e.target.tagName === 'BUTTON' && !e.target.disabled) { const selectedDate = e.target.dataset.date; const currentlySelected = calendarDatesContainer.querySelector('.selected'); if (currentlySelected) currentlySelected.classList.remove('selected'); e.target.classList.add('selected'); const dateObj = new Date(selectedDate.replace(/-/g, '/')); const displayDate = dateObj.toLocaleString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }); addMessage(`Selected Date: ${displayDate}`, "user"); hideCalendar(); processMessage(selectedDate); } });
    
    // --- REMOVED login choice button listeners ---
    
    if (adminLogoutBtn) { adminLogoutBtn.addEventListener("click", () => { currentUser = null; if (adminRefreshInterval) clearInterval(adminRefreshInterval); showChatInterface(); startBotFlow(); }); }
    else { console.error("Admin Logout Button not found!"); }

    // --- Start App ---
    function startMainChat() { conversationState = "initial"; botResponse(`Welcome, ${currentUser.name}! ✂️ How can I help?`, mainMenuOptions); setInputMode(false); }
    
    function startBotFlow() { 
        clearChat(); 
        conversationState = "auth_ask_phone"; 
        const welcomeMessage = "Welcome to Mithil's Salon! 🙏\n\n🕒 We're open from 10 AM to 10 PM.\n🎉 Special 10% OFF on weekends!\n✨ First-time users get 50% OFF their first booking!\n\nPlease enter your 10-digit phone number to get started.";
        botResponse(welcomeMessage, [], false, false); 
        setInputMode(false, "Enter phone number..."); 
    }
    
    startBotFlow(); // Start the bot immediately on page load

}); // End DOMContentLoaded