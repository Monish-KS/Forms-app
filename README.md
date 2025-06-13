# Collaborative Form Filling System

## Project Goal

This project aims to build a real-time collaborative form-filling system where multiple users can fill a single shared response to a form simultaneously. It's designed to function like "Google Docs for forms," allowing a group of users to collectively edit one shared response per form.

## Key Features

### Admin Features
*   **Authenticated Admin Dashboard**: Admins have access to a dedicated dashboard secured by NextAuth.js.
*   **Form Management**: Admins can create, update, and delete multiple forms.
*   **Dynamic Form Fields**: Each form can have dynamic fields of various types (text, number, dropdown with options).
*   **Real-time Validation Rules**: Forms can include real-time validation rules for fields.
*   **Invite Links/Join Codes**: Admins can generate unique invite links or join codes for users to collaborate on a specific form. These codes can also be regenerated for existing forms.

### User Features
*   **Join Shared Forms**: Users can join a shared form using a unique link or join code.
*   **Single Shared Response**: All users collaborate on a single, shared response object per form.
*   **Collaborative Editing**: Users can edit field values collaboratively in real-time.
*   **Live Updates**: Users see real-time typing and changes made by others, including active user presence indicators.
*   **Field Locking**: When one user is editing a field, others see it as locked, preventing simultaneous edits. Locks expire after inactivity or on blur.
*   **Conflict Handling**: The system implements a "last write wins" strategy for concurrent edits, preventing edits if a field is locked.

### Real-Time Synchronization
*   **Socket.IO Integration**: Form state is synced across all connected users using a dedicated Socket.IO server.
*   **Debounced Saving**: User input updates the local state immediately, with changes debounced before being emitted to the server via WebSockets and persisted to the database.
*   **Presence Tracking**: The Socket.IO server tracks active users within a form and broadcasts updates to all connected clients.

## Tech Stack

*   **Frontend/Backend Framework**: Next.js (Fullstack React Framework)
    *   Utilizes built-in API routes for backend endpoints.
    *   Optimized rendering (SSR/ISR/CSR mix) for performance.
    *   Ideal for fast prototyping and Vercel deployment.
*   **Database ORM**: Prisma ORM
    *   Provides type-safe, fast queries.
    *   Supports complex relational schemas (users, forms, fields, sessions, etc.).
    *   Excellent integration with PostgreSQL.
*   **Database**: PostgreSQL
    *   Reliable, ACID-compliant relational database.
    *   Excellent choice for structured form data and user relations.
*   **Real-Time Communication**: Socket.IO (via a standalone Node.js Express server)
    *   Enables real-time bi-directional communication.
    *   Supports broadcasting changes to all users in a form's "room."
    *   Decoupled from Next.js API routes for better scalability and deployment flexibility.
*   **Authentication**: NextAuth.js
    *   Supports social and email/password login.
    *   Uses JWT-based sessions.
    *   Implements role-based access control (admin vs. user).
*   **Client-Side State Management**: Zustand
    *   Lightweight and easy to manage for collaborative form data.
    *   Synchronizes local state with WebSocket updates.
*   **Containerization**: Docker, docker-compose
    *   Used for local development to provide consistent and isolated environments for the Next.js application, Socket.IO server, and PostgreSQL database.
*   **Linting & Formatting**: ESLint, Prettier
*   **Environment Configuration**: .env.local with dotenv
*   **Testing**: Jest or Vitest for unit tests, Postman for API testing (as per initial requirements, though specific tests may not be fully implemented yet).

## Architecture

The application follows a full-stack architecture leveraging Next.js for both frontend and API routes, a separate Socket.IO server for real-time communication, and PostgreSQL as the database.

*   **Next.js Application**:
    *   **Frontend**: React components handle the admin dashboard, form creation/editing, and the collaborative form-filling interface.
    *   **API Routes (`src/app/api/`)**:
        *   `src/app/api/auth/[...nextauth]/route.ts`: Manages authentication flows using NextAuth.js.
        *   `src/app/api/forms/route.ts`: Handles CRUD operations for forms (primarily for admin users).
        *   `src/app/api/forms/[formId]/route.ts`: Manages specific form details and allows for join code regeneration.
        *   `src/app/api/forms/[formId]/response/route.ts`: Manages the single shared response object for a form.
        *   `src/app/api/forms/join/route.ts`: Handles user requests to join a form using a join code.
*   **Prisma & PostgreSQL**:
    *   **Prisma Client**: A singleton `PrismaClient` instance (`src/lib/prisma.ts`) is used for all database interactions.
    *   **Schema Definition**: `prisma/schema.prisma` defines the database models (`User`, `Form`, `Field`, `SharedResponse`, `FormSession`).
    *   **Migrations**: Prisma Migrate is used to manage database schema changes.
*   **NextAuth.js**:
    *   **Configuration**: `src/lib/auth.ts` contains the NextAuth.js configuration, including providers and session strategies.
    *   **Integration**: Frontend components use `useSession` for session management, and role-based access control is enforced based on the `User` model's `role` field.
*   **Socket.IO Server**:
    *   A standalone Node.js Express application (`socket-server/src/index.ts`) hosts the Socket.IO server.
    *   It handles WebSocket connections, manages "rooms" for each form, and broadcasts real-time updates (`fieldUpdate`, `fieldLock`, `fieldUnlock`) to connected clients.
    *   It also tracks active users within each form and broadcasts presence updates.
*   **Zustand**:
    *   A Zustand store (`src/lib/store.ts`) manages the collaborative form data on the client-side.
    *   It is updated by incoming Socket.IO messages, ensuring a synchronized view of the form data across all clients.
    *   User input first updates the local Zustand state, then triggers debounced Socket.IO events.

## Data Models (Prisma Schema)

The `prisma/schema.prisma` defines the following models:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          String    @default("user") // "admin" or "user"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  forms         Form[]
  sessions      FormSession[]
}

model Form {
  id            String    @id @default(cuid())
  title         String
  description   String?
  joinCode      String?   @unique // Added for user joining via code
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdById   String
  createdBy     User      @relation(fields: [createdById], references: [id])
  fields        Field[]
  sharedResponse SharedResponse?
  sessions      FormSession[]
}

model Field {
  id            String    @id @default(cuid())
  type          String    // e.g., "text", "number", "dropdown"
  label         String
  options       String[]  // For dropdowns, store as JSON string array
  formId        String
  form          Form      @relation(fields: [formId], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model SharedResponse {
  id            String    @id @default(cuid())
  formId        String    @unique
  form          Form      @relation(fields: [formId], references: [id])
  values        Json      // Store form data as JSON object
  version       Int       @default(1) // Added for optimistic locking/conflict resolution
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model FormSession {
  id            String    @id @default(cuid())
  formId        String
  form          Form      @relation(fields: [formId], references: [id])
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  lastActive    DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## Setup & Run Instructions

### Using Docker (Recommended)

To set up and run the application locally using Docker:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Monish-KS/Forms-app
    cd Forms-app
    ```

2.  **Environment Variables**:
    Create a `.env.local` file in the root directory of the project and populate it with the following environment variables:

    ```
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase?schema=public"
    NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET" # Generate a strong secret
    NEXTAUTH_URL="http://localhost:3000"
    SOCKET_SERVER_URL="http://localhost:3001"
    CORS_ORIGIN="http://localhost:3000" # For Socket.IO server CORS
    ```
    *Replace `YOUR_NEXTAUTH_SECRET` with a strong, randomly generated string.*

3.  **Build and Run Docker Containers**:
    Navigate to the root directory of the project and run:
    ```bash
    docker-compose up --build
    ```
    This command will:
    *   Build the Docker images for the Next.js application and the Socket.IO server.
    *   Start the PostgreSQL database container.
    *   Start the Next.js application (accessible at `http://localhost:3000`).
    *   Start the Socket.IO server (accessible at `http://localhost:3001`).

4.  **Run Prisma Migrations**:
    Once the PostgreSQL container is running (you can check `docker-compose logs db`), run the Prisma migrations to set up your database schema. You'll need to execute this command from within the `proactively` directory:
    ```bash
    docker-compose exec nextjs-app npx prisma migrate deploy
    ```

5.  **Generate Prisma Client**:
    ```bash
    docker-compose exec nextjs-app npx prisma generate
    ```

6.  **Access the Application**:
    Open your web browser and navigate to `http://localhost:3000`.

### Manual Setup (Without Docker)

If you prefer not to use Docker, you can set up and run the application manually.

1.  **Prerequisites**:
    *   Node.js (v18 or higher)
    *   npm or yarn
    *   PostgreSQL (running locally, e.g., on `localhost:5432`)

2.  **Clone the repository**:
    ```bash
    git clone https://github.com/Monish-KS/Forms-app
    cd Forms-app
    ```

3.  **Environment Variables**:
    Create a `.env.local` file in the root directory of the project and populate it with the same environment variables as listed in the Docker setup section. Ensure your `DATABASE_URL` points to your local PostgreSQL instance.

4.  **Set up PostgreSQL Database**:
    Ensure you have a PostgreSQL server running locally. Create a database (e.g., `mydatabase`) and a user with appropriate permissions as specified in your `DATABASE_URL`.

5.  **Install Dependencies**:
    *   For the Next.js application:
        ```bash
        npm install # or yarn install
        ```
    *   For the Socket.IO server:
        ```bash
        cd socket-server
        npm install # or yarn install
        cd ..
        ```

6.  **Run Prisma Migrations**:
    From the root directory (`proactively`), run:
    ```bash
    npx prisma migrate dev --name initial_setup
    ```
    If you have existing migrations, you might just need `npx prisma migrate deploy`.

7.  **Generate Prisma Client**:
    From the root directory (`proactively`), run:
    ```bash
    npx prisma generate
    ```

8.  **Start the Socket.IO Server**:
    Open a new terminal, navigate to the `socket-server` directory, and run:
    ```bash
    npm start # or yarn start
    ```
    The server will typically run on `http://localhost:3001`.

9.  **Start the Next.js Application**:
    Open another new terminal, navigate to the root directory (`proactively`), and run:
    ```bash
    npm run dev # or yarn dev
    ```
    The Next.js application will start on `http://localhost:3000`.

10. **Access the Application**:
    Open your web browser and navigate to `http://localhost:3000`.

## Deployment

The application is designed for deployment on platforms like Vercel (for the Next.js frontend/backend) and managed PostgreSQL services (e.g., Railway, Render, Supabase). The Socket.IO server can be deployed as a standalone Node.js Express server on platforms like Railway. Dockerization facilitates consistent deployment environments.

## Testing

*   **Unit Tests**: Jest or Vitest can be used for unit testing individual components and functions.
*   **API Testing**: Postman can be used to test all major API endpoints and their payloads.

## Key Decisions & Edge Cases Handled

*   **Docker for Local Development**: Using `docker-compose` ensures a consistent and isolated development environment for PostgreSQL, Next.js, and the Socket.IO server, simplifying setup and avoiding conflicts.
*   **Standalone Socket.IO Server**: Migrating the Socket.IO server to a separate Node.js application (`socket-server/`) provides better scalability, separation of concerns, and deployment flexibility compared to integrating it directly into Next.js API routes.
*   **Join Code for Forms**: A `joinCode` field was added to the `Form` model to enable users to join forms via a unique code, fulfilling a core project requirement. This also involved implementing an API endpoint for generating and regenerating these codes.
*   **Debounced Saving**: Client-side form updates are debounced before being sent to the server, reducing the frequency of WebSocket messages and database writes, improving performance and reducing server load.
*   **Active User Display**: The Socket.IO server tracks and broadcasts active user presence within each form, providing real-time visibility of collaborators.
*   **CORS Policy for Socket.IO**: The Socket.IO server's CORS policy is configured using an environment variable (`CORS_ORIGIN`) to ensure secure communication in production environments.
*   **Improved Error Handling**: API routes include enhanced error handling and logging to provide more informative messages to the client, aiding in debugging and user experience.
*   **Optimistic Locking (Version Field)**: A `version` field was added to the `SharedResponse` model to facilitate optimistic locking, which can be used for more robust conflict resolution strategies in the future.
