# FINANCE-DASHBOARD-SYSTEM
https://github.com/ShannuF1/FINANCE-DASHBOARD-SYSTEM.git


FINANCE DASHBOARD API:


A simple Node.js REST API for managing income and expenses. It features user authentication (JWT), role-based access control (Admin/Viewer), and a SQLite database.

🚀 Getting Started
1. Prerequisites
Ensure you have Node.js installed on your system.
2. Project Setup
Open your terminal in VS Code and run the following commands:

Bash
# 1. Initialize the project
npm init -y

# 2. Install required dependencies
npm install express sqlite3 jsonwebtoken bcryptjs cors


# 3. Running the Server
To start the application, run:

Bash

node Express.js

The terminal should display: Server running on port 5000.

🛠️ Testing with Postman (Step-by-Step)


Follow these steps in order to test the API correctly.

Step 1: Register an Admin User
You must create a user with the "admin" role to add or edit records.

Method: POST

URL: http://localhost:5000/register

Body (Raw JSON):

JSON


{
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "password123",
  "role": "admin"
}



Step 2: Login to Get Token
This step generates your "Digital Key" (JWT).

Method: POST

URL: http://localhost:5000/login

Body (Raw JSON):

JSON
{
  "email": "admin@test.com",
  "password": "password123"
}


Action: Copy the long string inside the "token": "..." response. Do not include the quotes.

Step 3: Add a Financial Record

Method: POST

URL: http://localhost:5000/records

Headers:

Key: Authorization

Value: [Paste your copied token here]

Body (Raw JSON):

JSON
{
  "amount": 2500,
  "type": "income",
  "category": "Freelance",
  "notes": "Web Design Project"
}


Step 4: View the Dashboard


Check your total balance and summaries.

Method: GET

URL: http://localhost:5000/dashboard

Headers:

Key: Authorization

Value: [Paste your token]

🌐 Built With


Express.js - Web Framework

SQLite3 - Database

JWT - Security/Authentication

BcryptJS - Password Hashing
