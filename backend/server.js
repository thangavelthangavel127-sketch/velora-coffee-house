const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./database");

const app = express();
const PORT = 3000;

const JWT_SECRET = "velora_coffee_secret_key";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Velora Coffee Backend is Running!");
});

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingUser = db
            .prepare("SELECT id FROM users WHERE email = ?")
            .get(email);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = db.prepare(`
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `).run(name, email, hashedPassword, "user");

        res.json({
            success: true,
            message: "Registration successful",
            userId: result.lastInsertRowid
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({
            success: true,
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
});

// ==========================
// CUSTOMER: PLACE ORDER
// ==========================

app.post("/api/orders", verifyToken, (req, res) => {
    try {
        const { items, total_amount, payment_method, payment_status, address } = req.body;

        if (!items || !items.length || !total_amount) {
            return res.status(400).json({
                success: false,
                message: "Order items and total amount are required"
            });
        }

        const result = db.prepare(`
            INSERT INTO orders (user_id, total_amount, status, payment_method, payment_status, address, items_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.id,
            total_amount,
            "Order Placed",
            payment_method || "Cash on Delivery",
            payment_status || "Pending",
            address || "",
            JSON.stringify(items)
        );

        res.json({
            success: true,
            message: "Order placed successfully",
            orderId: result.lastInsertRowid
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to place order" });
    }
});

// ==========================
// CUSTOMER: MY ORDERS
// ==========================

app.get("/api/orders/my", verifyToken, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
        `).all(req.user.id);

        res.json({ success: true, orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
});

// ==========================
// AUTH MIDDLEWARE
// ==========================

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

function verifyAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access only"
        });
    }
    next();
}

// ==========================
// PRODUCT ROUTES (public read)
// ==========================

app.get("/api/products", (req, res) => {
    try {
        const products = db.prepare("SELECT * FROM products").all();
        res.json({ success: true, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});

// ==========================
// ADMIN: PRODUCT MANAGEMENT
// ==========================

app.post("/api/admin/products", verifyToken, verifyAdmin, (req, res) => {
    try {
        const { name, description, price, image, category } = req.body;

        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: "Name and price are required"
            });
        }

        const result = db.prepare(`
            INSERT INTO products (name, description, price, image, category)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, description || "", price, image || "", category || "");

        res.json({
            success: true,
            message: "Product added",
            productId: result.lastInsertRowid
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to add product" });
    }
});

app.put("/api/admin/products/:id", verifyToken, verifyAdmin, (req, res) => {
    try {
        const { name, description, price, image, category } = req.body;
        const { id } = req.params;

        db.prepare(`
            UPDATE products
            SET name = ?, description = ?, price = ?, image = ?, category = ?
            WHERE id = ?
        `).run(name, description || "", price, image || "", category || "", id);

        res.json({ success: true, message: "Product updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update product" });
    }
});

app.delete("/api/admin/products/:id", verifyToken, verifyAdmin, (req, res) => {
    try {
        const { id } = req.params;
        db.prepare("DELETE FROM products WHERE id = ?").run(id);
        res.json({ success: true, message: "Product deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
});

// ==========================
// ADMIN: ORDER MANAGEMENT
// ==========================

app.get("/api/admin/orders", verifyToken, verifyAdmin, (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT orders.*, users.name AS customer_name, users.email AS customer_email
            FROM orders
            JOIN users ON orders.user_id = users.id
            ORDER BY orders.created_at DESC
        `).all();

        res.json({ success: true, orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
});

app.put("/api/admin/orders/:id/status", verifyToken, verifyAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);

        res.json({ success: true, message: "Order status updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update order status" });
    }
});

app.listen(PORT, () => {
    console.log(
        `Velora Coffee Backend running at http://localhost:${PORT}`
    );
});