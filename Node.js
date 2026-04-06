const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ================= DATABASE =================
const db = new sqlite3.Database("./finance.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      type TEXT,
      category TEXT,
      date TEXT,
      notes TEXT,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

// ================= MIDDLEWARE =================
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, "secret");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ msg: "Access denied" });
  }
  next();
};

// ================= AUTH =================
app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "Missing fields" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)",
      [name, email, hash, role || "viewer"],
      function (err) {
        if (err) return res.status(400).json({ msg: "User exists or DB error" });
        res.json({ id: this.lastID });
      }
    );
  } catch (e) {
    res.status(500).json({ msg: "Server error" });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ msg: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign({ id: user.id, role: user.role }, "secret");
    res.json({ token });
  });
});

// ================= RECORDS =================
app.post("/records", auth, role("admin"), (req, res) => {
  const { amount, type, category, notes } = req.body;

  if (!amount || !type) {
    return res.status(400).json({ msg: "Amount & type required" });
  }

  db.run(
    "INSERT INTO records (amount,type,category,date,notes,user_id) VALUES (?,?,?,?,?,?)",
    [Number(amount), type, category, new Date().toISOString(), notes, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ msg: "Error adding record" });
      res.json({ id: this.lastID });
    }
  );
});

app.get("/records", auth, (req, res) => {
  const { type, category } = req.query;
  let query = "SELECT * FROM records WHERE 1=1";
  let params = [];

  if (type) { query += " AND type = ?"; params.push(type); }
  if (category) { query += " AND category = ?"; params.push(category); }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ msg: "DB error" });
    res.json(rows);
  });
});

// ================= DASHBOARD =================
app.get("/dashboard", auth, (req, res) => {
  db.all("SELECT * FROM records", [], (err, rows) => {
    if (err) return res.status(500).json({ msg: "DB error" });
    let income = 0, expense = 0;

    rows.forEach(r => {
      if (r.type === "income") income += r.amount;
      else expense += r.amount;
    });

    res.json({
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense
    });
  });
});

// ================= FRONTEND =================
app.get("/", (req, res) => {
  res.send(`
    <h2>Finance App</h2>
    <h3>Login</h3>
    <input id="email" placeholder="email"><br>
    <input id="pass" type="password" placeholder="password"><br>
    <button onclick="login()">Login</button>
    <hr>
    <h3>Add Record (Admin Only)</h3>
    <input id="amount" type="number" placeholder="amount"><br>
    <select id="type">
      <option value="income">income</option>
      <option value="expense">expense</option>
    </select><br>
    <input id="cat" placeholder="category"><br>
    <button onclick="add()">Add</button>
    <hr>
    <h3>Dashboard</h3>
    <button onclick="dash()">Refresh Data</button>
    <pre id="out"></pre>

    <script>
      let token = "";

      async function login(){
        const res = await fetch('/login',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ email: email.value, password: pass.value })
        });
        const data = await res.json();
        if(data.token) {
            token = data.token;
            alert("Login success");
        } else {
            alert(data.msg);
        }
      }

      async function add(){
        const res = await fetch('/records',{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            amount: amount.value,
            type: type.value,
            category: cat.value
          })
        });
        const data = await res.json();
        alert(data.msg || "Added Successfully");
      }

      async function dash(){
        const res = await fetch('/dashboard',{
          headers:{'Authorization': token}
        });
        const data = await res.json();
        document.getElementById('out').innerText = JSON.stringify(data, null, 2);
      }
    </script>
  `);
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
