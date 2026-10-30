
/* =========================================
   MINIDASH FRONTEND JAVASCRIPT
========================================= */

// API uses the same server as the website
const API_URL = window.location.origin;

// Application data
let restaurants = [];
let selectedRestaurant = null;
let cart = [];

// HTML elements
const restaurantGrid = document.getElementById("restaurantGrid");
const menuGrid = document.getElementById("menuGrid");
const menuSection = document.getElementById("menuSection");
const menuTitle = document.getElementById("menuTitle");

const searchInput = document.getElementById("searchInput");
const cuisineFilter = document.getElementById("cuisineFilter");

const cartButton = document.getElementById("cartButton");
const cartSidebar = document.getElementById("cartSidebar");
const cartOverlay = document.getElementById("cartOverlay");
const closeCartButton = document.getElementById("closeCart");

const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");

const checkoutForm = document.getElementById("checkoutForm");
const checkoutMessage = document.getElementById("checkoutMessage");
const deliveryAddress = document.getElementById("deliveryAddress");

const trackingForm = document.getElementById("trackingForm");
const trackingOrderId = document.getElementById("trackingOrderId");
const trackingResult = document.getElementById("trackingResult");

// Format prices as US dollars
function formatPrice(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

// Display safe text in an HTML element
function addText(element, text) {
  element.textContent = String(text);
}

// Create an HTML element with optional class
function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) addText(element, text);

  return element;
}

// =========================================
// 1. LOAD RESTAURANTS
// GET /restaurants
// =========================================

async function loadRestaurants() {
  try {
    const response = await fetch(`${API_URL}/restaurants`);

    if (!response.ok) {
      throw new Error("Could not load restaurants");
    }

    restaurants = await response.json();

    renderRestaurants();
  } catch (error) {
    restaurantGrid.textContent =
      "Unable to load restaurants. Check that the server is running.";

    console.error(error);
  }
}

// Display restaurant cards
function renderRestaurants() {
  const search = searchInput.value.trim().toLowerCase();
  const cuisine = cuisineFilter.value;

  const filtered = restaurants.filter(restaurant => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(search) ||
      restaurant.cuisine.toLowerCase().includes(search);

    const matchesCuisine =
      cuisine === "all" || restaurant.cuisine === cuisine;

    return matchesSearch && matchesCuisine;
  });

  restaurantGrid.replaceChildren();

  if (filtered.length === 0) {
    restaurantGrid.appendChild(
      createElement("p", "", "No matching restaurants found.")
    );
    return;
  }

  const cuisineIcons = {
    Italian: "🍕",
    Japanese: "🍣",
    American: "🍔"
  };

  filtered.forEach(restaurant => {
    const card = createElement("article", "restaurant-card");

    const image = createElement(
      "div",
      "restaurant-image",
      cuisineIcons[restaurant.cuisine] || "🍽️"
    );

    const info = createElement("div", "restaurant-info");

    info.appendChild(
      createElement("h3", "", restaurant.name)
    );

    info.appendChild(
      createElement("p", "", restaurant.cuisine + " Cuisine")
    );

    const meta = createElement("div", "restaurant-meta");

    meta.appendChild(
      createElement(
        "span",
        "",
        "🕒 " + restaurant.opening_hours
      )
    );

    meta.appendChild(
      createElement(
        "span",
        "",
        "⚡ " + restaurant.avg_prep_time + " min"
      )
    );

    const button = createElement(
      "button",
      "view-menu-btn",
      "View Menu →"
    );

    button.type = "button";

    button.addEventListener("click", () => {
      loadMenu(restaurant);
    });

    info.append(meta, button);
    card.append(image, info);
    restaurantGrid.appendChild(card);
  });
}

// Search and cuisine filtering
searchInput.addEventListener("input", renderRestaurants);
cuisineFilter.addEventListener("change", renderRestaurants);

// =========================================
// 2. LOAD RESTAURANT MENU
// GET /restaurants/:id/menu
// =========================================

async function loadMenu(restaurant) {
  try {
    const response = await fetch(
      `${API_URL}/restaurants/${restaurant.id}/menu`
    );

    if (!response.ok) {
      throw new Error("Could not load menu");
    }

    const data = await response.json();

    selectedRestaurant = restaurant;

    addText(menuTitle, restaurant.name + " Menu");
    menuGrid.replaceChildren();

    const foodIcons = ["🍕", "🍟", "🍔", "🍣", "🥗", "🍜"];

    data.items.forEach((item, index) => {
      const card = createElement("article", "menu-card");

      const image = createElement(
        "div",
        "menu-image",
        foodIcons[index % foodIcons.length]
      );

      const info = createElement("div", "menu-info");

      info.appendChild(createElement("h3", "", item.name));

      info.appendChild(
        createElement("p", "menu-price", formatPrice(item.price))
      );

      const button = createElement(
        "button",
        "add-btn",
        "Add to Cart +"
      );

      button.type = "button";

      button.addEventListener("click", () => {
        addToCart(item, restaurant);
      });

      info.appendChild(button);
      card.append(image, info);
      menuGrid.appendChild(card);
    });

    menuSection.hidden = false;
    menuSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error(error);
    alert("Unable to load this menu. Please try again.");
  }
}

// Return to restaurant list
document.getElementById("backButton")
  .addEventListener("click", () => {
    menuSection.hidden = true;
    selectedRestaurant = null;

    document.getElementById("restaurants")
      .scrollIntoView({ behavior: "smooth" });
  });

// =========================================
// 3. SHOPPING CART
// =========================================

function addToCart(item, restaurant) {
  // The backend only accepts items from one restaurant
  if (
    cart.length > 0 &&
    cart[0].restaurant_id !== restaurant.id
  ) {
    const replace = confirm(
      "Your cart contains food from another restaurant. " +
      "Clear your cart and start a new order?"
    );

    if (!replace) return;

    cart = [];
  }

  const existing = cart.find(
    cartItem => cartItem.menu_item_id === item.id
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      restaurant_id: restaurant.id,
      menu_item_id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1
    });
  }

  checkoutMessage.textContent = "";
  renderCart();
  openCart();
}

function renderCart() {
  cartItems.replaceChildren();

  let totalCents = 0;
  let quantityCount = 0;

  if (cart.length === 0) {
    cartItems.appendChild(
      createElement("p", "", "Your cart is empty. Add something tasty!")
    );
  }

  cart.forEach(item => {
    const priceCents = Math.round(item.price * 100);

    totalCents += priceCents * item.quantity;
    quantityCount += item.quantity;

    const row = createElement("div", "cart-item");
    const details = createElement("div");

    details.appendChild(createElement("h4", "", item.name));

    details.appendChild(
      createElement(
        "p",
        "",
        formatPrice(priceCents * item.quantity / 100)
      )
    );

    const controls = createElement("div", "quantity-controls");

    const minus = createElement("button", "", "−");
    minus.type = "button";
    minus.setAttribute("aria-label", "Remove one " + item.name);

    minus.addEventListener("click", () => {
      updateQuantity(item.menu_item_id, -1);
    });

    const count = createElement("span", "", item.quantity);

    const plus = createElement("button", "", "+");
    plus.type = "button";
    plus.setAttribute("aria-label", "Add one " + item.name);

    plus.addEventListener("click", () => {
      updateQuantity(item.menu_item_id, 1);
    });

    controls.append(minus, count, plus);
    row.append(details, controls);
    cartItems.appendChild(row);
  });

  addText(cartCount, quantityCount);
  addText(cartTotal, formatPrice(totalCents / 100));
}

function updateQuantity(menuItemId, change) {
  const item = cart.find(
    cartItem => cartItem.menu_item_id === menuItemId
  );

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    cart = cart.filter(
      cartItem => cartItem.menu_item_id !== menuItemId
    );
  }

  renderCart();
}

function openCart() {
  cartSidebar.classList.add("open");
  cartSidebar.setAttribute("aria-hidden", "false");
  cartOverlay.hidden = false;
  closeCartButton.focus();
}

function closeCart() {
  cartSidebar.classList.remove("open");
  cartSidebar.setAttribute("aria-hidden", "true");
  cartOverlay.hidden = true;
  cartButton.focus();
}

cartButton.addEventListener("click", openCart);
closeCartButton.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" &&
      cartSidebar.classList.contains("open")) {
    closeCart();
  }
});

// ========================================
// SCHEDULED DELIVERY CONTROLS
// ========================================

const scheduleFields = document.getElementById("scheduleFields");
const scheduledDeliveryTime = document.getElementById("scheduledDeliveryTime");

document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
  radio.addEventListener("change", () => {
    const isScheduled = document.querySelector(
      'input[name="deliveryType"]:checked'
    ).value === "scheduled";

    scheduleFields.hidden = !isScheduled;
    scheduledDeliveryTime.required = isScheduled;

    if (!isScheduled) {
      scheduledDeliveryTime.value = "";
    }
  });
});

// =========================================
// 4. CHECKOUT
// POST /orders
// =========================================

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (cart.length === 0) {
    checkoutMessage.textContent =
      "Please add food to your cart first.";
    return;
  }

  const address = deliveryAddress.value.trim();

  if (!address) {
    checkoutMessage.textContent =
      "Please enter a delivery address.";
    return;
  }

  const submitButton = checkoutForm.querySelector(
    'button[type="submit"]'
  );

  const order = {
    restaurant_id: cart[0].restaurant_id,
    items: cart.map(item => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity
    })),
    delivery_address: address
  };

  // Add scheduled delivery time when selected
const deliveryType = document.querySelector(
  'input[name="deliveryType"]:checked'
).value;

if (deliveryType === "scheduled") {

  if (!scheduledDeliveryTime.value) {
    checkoutMessage.textContent =
      "Please select a delivery date and time.";
    return;
  }

  const selectedDate = new Date(scheduledDeliveryTime.value);

  if (!Number.isFinite(selectedDate.getTime())) {
    checkoutMessage.textContent =
      "Please enter a valid delivery date and time.";
    return;
  }

  order.scheduled_delivery_time = selectedDate.toISOString();
}

  submitButton.disabled = true;
  submitButton.textContent = "Placing Order...";

  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(order)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Order failed");
    }

    checkoutMessage.textContent =
      `🎉 Order #${result.order_id} placed! Total: ` +
      formatPrice(result.total);

    trackingOrderId.value = result.order_id;

    cart = [];
    renderCart();
    deliveryAddress.value = "";

    // Show the tracking section after checkout
    await trackOrder(result.order_id);

    closeCart();

    document.getElementById("tracking")
      .scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    checkoutMessage.textContent = error.message;
    console.error(error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Place Order 🚀";
  }
});

// =========================================
// 5. ORDER TRACKING
// GET /orders/:id
// =========================================


/* =========================================
   COLORFUL ORDER TRACKING
========================================= */

const orderStages = [
  { status: "placed", label: "Placed", icon: "📝" },
  { status: "confirmed", label: "Confirmed", icon: "✅" },
  { status: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { status: "ready", label: "Ready", icon: "📦" },
  { status: "picked_up", label: "Picked Up", icon: "🚴" },
  { status: "delivered", label: "Delivered", icon: "🏠" }
];

async function trackOrder(orderId) {
  trackingResult.replaceChildren();

  try {
    const response = await fetch(
      `${API_URL}/orders/${orderId}`
    );

    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || "Order not found");
    }

    const card = createElement("div", "order-tracking-card");

    // Order number and current status
    const heading = createElement(
      "div",
      "order-status-heading"
    );

    heading.appendChild(
      createElement("h3", "", `Order #${order.id}`)
    );

  const normalizedStatus = String(order.status).toLowerCase();

const displayStatus = normalizedStatus
  .replaceAll("_", " ")
  .toUpperCase();

    heading.appendChild(
      createElement("span", "status-badge", displayStatus)
    );

    card.appendChild(heading);

    // Cancelled orders have no delivery progress
    if (normalizedStatus === "cancelled") {
      card.appendChild(
        createElement(
          "div",
          "cancelled-message",
          "❌ This order has been cancelled."
        )
      );
    } else {
      const stageIndex = orderStages.findIndex(
  stage => stage.status === normalizedStatus
);

      if (stageIndex >= 0) {
        const progress = createElement(
          "div",
          "order-progress"
        );

        progress.appendChild(
          createElement("h4", "", "🚀 Delivery Progress")
        );

        const track = createElement("div", "progress-track");
        const fill = createElement("div", "progress-fill");

        const percentage =
          (stageIndex / (orderStages.length - 1)) * 100;

        fill.style.width = `${percentage}%`;

        fill.setAttribute("role", "progressbar");
        fill.setAttribute("aria-label", "Delivery progress");
        fill.setAttribute("aria-valuemin", "0");
        fill.setAttribute("aria-valuemax", "100");
        fill.setAttribute("aria-valuenow", String(percentage));

        track.appendChild(fill);
        progress.appendChild(track);

        // Show all six stages
        const steps = createElement(
          "div",
          "progress-steps"
        );

        orderStages.forEach((stage, index) => {
          const step = createElement(
            "div",
            "progress-step"
          );

          if (index < stageIndex) {
            step.classList.add("completed");
          }

          if (index === stageIndex) {
            step.classList.add("current");
            step.setAttribute("aria-current", "step");
          }

          const icon = createElement(
            "div",
            "step-icon",
            stage.icon
          );

          const label = createElement(
            "div",
            "",
            stage.label
          );

          step.append(icon, label);
          steps.appendChild(step);
        });

        progress.appendChild(steps);
        card.appendChild(progress);
      } else {
        card.appendChild(
          createElement(
            "p",
            "",
            "Current status: " + displayStatus
          )
        );
      }
    }

    // Order details
    const details = createElement(
      "div",
      "order-details"
    );

  // Display the restaurant name
const restaurantName =
  order.restaurant_name ||
  order.restaurant?.name ||
  (order.restaurant_id === 1 ? "Keta's Kitchen" :
   order.restaurant_id === 2 ? "Pizza Corner" :
   "Restaurant #" + order.restaurant_id);

details.appendChild(
  createElement(
    "p",
    "",
    "🏪 Restaurant: " + restaurantName
  )
);

    details.appendChild(
      createElement(
        "p",
        "",
        "📍 Delivery: " + order.delivery_address
      )
    );

    details.appendChild(
      createElement(
        "p",
        "",
        "💰 Total: " + formatPrice(order.total)
      )
    );

    details.appendChild(
      createElement("h4", "", "Your Items")
    );

    const list = createElement(
      "ul",
      "order-items-list"
    );

    (order.items || []).forEach(item => {
      list.appendChild(
        createElement(
          "li",
          "",
          `${item.quantity} × ${item.name} — ` +
          formatPrice(item.subtotal)
        )
      );
    });

    details.appendChild(list);
    card.appendChild(details);

    // Manual refresh button
    const actions = createElement(
      "div",
      "tracking-actions"
    );

    const refreshButton = createElement(
      "button",
      "refresh-btn",
      "🔄 Refresh Status"
    );

    refreshButton.type = "button";

    refreshButton.addEventListener("click", () => {
      trackOrder(order.id);
    });

    actions.appendChild(refreshButton);
    // Allow cancellation before a scheduled order is released
if (String(order.status).toUpperCase() === "SCHEDULED") {
  const cancelButton = createElement(
    "button",
    "cancel-order-btn",
    "❌ Cancel Scheduled Order"
  );

  cancelButton.type = "button";

  cancelButton.addEventListener("click", async () => {
    const confirmed = confirm(
      `Are you sure you want to cancel Order #${order.id}?`
    );

    if (!confirmed) return;

    cancelButton.disabled = true;
    cancelButton.textContent = "Cancelling...";

    try {
      const response = await fetch(
        `${API_URL}/orders/${order.id}/cancel`,
        {
          method: "POST"
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Cancellation failed");
      }

      alert(`Order #${order.id} has been cancelled.`);

      await trackOrder(order.id);

    } catch (error) {
      alert(error.message);
      cancelButton.disabled = false;
      cancelButton.textContent = "❌ Cancel Scheduled Order";
    }
  });

  actions.appendChild(cancelButton);
}
    card.appendChild(actions);

    trackingResult.appendChild(card);

  } catch (error) {
    trackingResult.appendChild(
      createElement(
        "p",
        "",
        "Unable to track order: " + error.message
      )
    );
  }
}


trackingForm.addEventListener("submit", event => {
  event.preventDefault();

  const orderId = Number(trackingOrderId.value);

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    trackingResult.textContent =
      "Please enter a valid order number.";
    return;
  }

  trackOrder(orderId);
});

// =========================================
// INITIALIZE MINIDASH
// =========================================

loadRestaurants();
renderCart();