// =========================
// VELORA COFFEE
// script.js
// =========================

// Load cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save cart
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// =========================
// ADD TO CART
// =========================
function addCart(name, price, image) {

    let item = cart.find(c => c.name === name);

    if (item) {
        item.qty++;
    } else {
        cart.push({
            name: name,
            price: price,
            image: image,
            qty: 1
        });
    }

    saveCart();

    // Direct move to Cart Page
    window.location.href = "cart.html";
}

// =========================
// DISPLAY CART
// =========================
function displayCart() {

    let cartItems = document.getElementById("cartItems");
    let totalBox = document.getElementById("grandTotal");

    if (!cartItems) return;

    let html = "";
    let total = 0;

    if (cart.length === 0) {

        cartItems.innerHTML = `
        <h2 style="text-align:center;">
            Your Cart is Empty ☕
        </h2>
        `;

        if (totalBox)
            totalBox.innerHTML = "Total : ₹0";

        return;
    }

    cart.forEach((item, index) => {

        let subtotal = item.price * item.qty;

        total += subtotal;

        html += `

<div class="cart-card">

<img src="${item.image}">

<div class="cart-details">

<h2>${item.name}</h2>

<p>Price : ₹${item.price}</p>

<div class="qty">

<button onclick="minus(${index})">-</button>

<span>${item.qty}</span>

<button onclick="plus(${index})">+</button>

</div>

<h3>Subtotal : ₹${subtotal}</h3>

<button onclick="removeItem(${index})">
Remove
</button>

</div>

</div>

`;

    });

    cartItems.innerHTML = html;

    if (totalBox)
        totalBox.innerHTML = "Total : ₹" + total;

}

// =========================
// PLUS
// =========================
function plus(index) {

    cart[index].qty++;

    saveCart();

    displayCart();

}

// =========================
// MINUS
// =========================
function minus(index) {

    if (cart[index].qty > 1) {

        cart[index].qty--;

    }

    saveCart();

    displayCart();

}

// =========================
// REMOVE
// =========================
function removeItem(index) {

    cart.splice(index, 1);

    saveCart();

    displayCart();

}

// =========================
// CHECKOUT
// =========================
function checkout() {

    if (cart.length == 0) {

        alert("Cart is Empty");

        return;

    }

    window.location.href = "checkout.html";

}

// =========================
// PAYMENT
// =========================
function paymentSuccess() {

    localStorage.removeItem("cart");

    window.location.href = "success.html";

}

// =========================
// AUTO LOAD
// =========================
window.onload = function () {

    displayCart();

};
