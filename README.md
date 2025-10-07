# MAITRI: Full-Stack Astronaut Companion

MAITRI has been upgraded from a frontend-only prototype to a full-stack application featuring a Node.js backend. This provides a centralized, persistent, and real-time data store, allowing for a true multi-user, multi-device experience.

## Project Structure

- `/` (root): Contains the frontend React application.
- `/server`: Contains the new Node.js, Express, and MongoDB backend.

## Prerequisites

- [Node.js](https://nodejs.org/) (which includes `npm`)
- A [MongoDB](https://www.mongodb.com/try/download/community) database instance (you can run one locally or use a free cloud service like MongoDB Atlas).

## Backend Setup

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    -   In the `/server` directory, create a file named `.env`.
    -   Copy the contents of `.env.example` into your new `.env` file.
    -   **`MONGO_URI`**: Replace the placeholder with the connection string for your MongoDB database.
    -   **`JWT_SECRET`**: Replace the placeholder with a long, random, secret string. This is used to sign authentication tokens.

4.  **Run the backend server:**
    ```bash
    npm run dev
    ```
    The server will start, typically on `http://localhost:3001`.

## Frontend Setup

1.  **Open a new, separate terminal window.** Make sure you are in the project's root directory (not the `/server` directory).

2.  **The frontend is already configured.** You can run it as you normally would. The application is set up to automatically proxy API requests to the backend server.

The frontend application will be accessible, and it will now communicate with your running backend server for all data and authentication. You can now register a user in one browser and log in as an admin in another to see the data in real-time.
