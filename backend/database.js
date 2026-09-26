const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database("velora.db");

db.pragma("foreign_keys = ON");

// USERS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// PRODUCTS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Seed default menu items into products table if it's empty
const productCount = db.prepare("SELECT COUNT(*) AS count FROM products").get();

if (productCount.count === 0) {
    const insertProduct = db.prepare(`
        INSERT INTO products (name, description, price, image, category)
        VALUES (?, ?, ?, ?, ?)
    `);

    const defaultProducts = [
        ["Americano", "Classic black coffee", 150, "images/americano.jpg", "Coffee"],
        ["Cappuccino", "Espresso with steamed milk foam", 180, "images/cappuccino.jpg", "Coffee"],
        ["Espresso", "Strong concentrated coffee shot", 140, "images/espresso.jpg", "Coffee"],
        ["Latte", "Espresso with steamed milk", 190, "images/latte.jpg", "Coffee"],
        ["Mocha", "Espresso with chocolate and milk", 210, "images/mocha.jpg", "Coffee"],
        ["Macchiato", "Espresso with a dash of milk foam", 220, "images/macchiato.jpg", "Coffee"],
        ["Flat White", "Espresso with velvety steamed milk", 200, "images/flatwhite.jpg", "Coffee"],
        ["Cold Coffee", "Chilled blended coffee", 170, "images/coldcoffee.jpg", "Cold Coffee"],
        ["Hazelnut Coffee", "Coffee with hazelnut flavor", 230, "images/hazelnut.jpg", "Coffee"],
        ["Irish Coffee", "Coffee with a rich creamy twist", 250, "images/irishcoffee.jpg", "Coffee"]
    ];

    defaultProducts.forEach(function(p) {
        insertProduct.run(p[0], p[1], p[2], p[3], p[4]);
    });

    console.log("Default menu items added to products table.");
}

// ORDERS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Order Placed',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Pending',
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// ORDER ITEMS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
`);

// PAYMENTS TABLE
db.exec(`
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Pending',
    transaction_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
`);

// Add items_json column if it doesn't already exist (stores ordered items as JSON)
try {
    db.exec(`ALTER TABLE orders ADD COLUMN items_json TEXT;`);
} catch (e) {
    // Column already exists, ignore
}

// DEFAULT ADMIN ACCOUNT
const adminEmail = "admin@veloracoffee.com";
const adminPassword = "admin123";

const existingAdmin = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(adminEmail);

if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    db.prepare(`
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
    `).run(
        "Velora Admin",
        adminEmail,
        hashedPassword,
        "admin"
    );

    console.log("Default admin account created.");
}

console.log("Velora Coffee database initialized successfully.");

module.exports = db;