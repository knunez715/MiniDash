# 🍔 MiniDash — Food Delivery REST API & Web Application

MiniDash is a full-stack food delivery application built with Node.js, Express, SQLite, HTML, CSS, and JavaScript.

The application allows users to browse restaurants, search by cuisine, explore menus, add food to a shopping cart, place orders, and track delivery progress through an interactive interface.

## Features

- **Restaurant discovery:** Browse available restaurants and filter by cuisine.
- **Interactive menus:** View menu items and prices.
- **Shopping cart:** Add items, change quantities, and calculate order totals.
- **Checkout:** Submit orders with a delivery address.
- **Order tracking:** View order details and delivery progress.
- **REST API:** Five endpoints for restaurant discovery, menus, order creation, order retrieval, and order status updates.
- **Responsive design:** Colorful layout that adapts to desktop and mobile screens.

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | SQLite3 |
| Frontend | HTML5, CSS3, JavaScript |
| API Testing | REST Client (VS Code) |
| Version Control | Git and GitHub |

## Installation

### Prerequisites

Install Node.js and Git.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/MiniDash-REST-API.git
cd MiniDash-REST-API
```

Replace `YOUR-USERNAME` with your GitHub username.

### 2. Install Dependencies

```bash
npm install
```

On Windows, if `npm` is not recognized, use `npm.cmd install`.

### 3. Initialize the Database

```bash
node database.js
```

This creates the local SQLite database, its tables, and sample restaurant/menu data.

### 4. Start the Application

```bash
npm start
```

On Windows, you can use `npm.cmd start`.

### 5. Open MiniDash

Visit:

http://localhost:3000

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/restaurants` | Retrieve all restaurants |
| GET | `/restaurants/:id/menu` | Retrieve a restaurant's menu |
| POST | `/orders` | Create a new order |
| GET | `/orders/:id` | Retrieve order details |
| PATCH | `/orders/:id/status` | Update an order's status |

### Example: Create an Order

**POST** `/orders`

```json
{
  "restaurant_id": 1,
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2
    },
    {
      "menu_item_id": 3,
      "quantity": 1
    }
  ],
  "delivery_address": "123 Main Street, New York, NY"
}
```

### Supported Order Statuses

- `placed`
- `confirmed`
- `preparing`
- `ready`
- `picked_up`
- `delivered`
- `cancelled`

## API Testing

The `requests.http` file contains example HTTP requests for testing all five API endpoints.

To use it:

1. Install the REST Client extension in Visual Studio Code.
2. Start the Express server.
3. Open `requests.http`.
4. Click **Send Request** above the request you want to test.

## Project Structure

```text
MiniDash/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── database.js
├── server.js
├── requests.http
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
```

The `node_modules` directory and local database are excluded from Git version control.

## Future Improvements

- User registration and login
- Restaurant images and ratings
- Payment processing
- Admin dashboard for order management
- Live delivery notifications

## Project Status

MiniDash is a functional educational full-stack application demonstrating REST API development, SQLite database integration, and frontend/backend communication.

**Note:** MiniDash is a local demonstration project. It does not process real payments or dispatch real deliveries.