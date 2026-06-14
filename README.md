# IronForge 🏋️‍♂️

IronForge is a premium, strength-focused, offline-first workout tracking application. Built with **React Native (Expo SDK 54)**, **NativeWind v4**, **Zustand**, and **Supabase**, it is designed to help lifters track their routines, log sessions, visualize progress, and apply progressive overload principles seamlessly—with or without an active internet connection.

---

## 🌟 Key Features

### 1. Offline-First & Last-Write-Wins (LWW) Sync Queue
*   **Zero Latency**: All workout logging, weight changes, and measurements are instantly persisted locally to `AsyncStorage`.
*   **Reliable Background Sync**: A custom synchronization engine detects internet connection shifts. When online, local items queue up and upload using stateless Supabase REST APIs.
*   **LWW Resolution**: Updates to the database include timestamps to resolve conflict states using a Last-Write-Wins strategy.

### 2. Guest Mode & Guest-to-User Data Migration
*   **Instant Access**: Jump straight into tracking workout routines as a guest user immediately without an account.
*   **Seamless Migration**: Create an account or sign in with Google/Email credentials later; all guest logs, plans, PRs, measurements, and configurations automatically migrate to the new authenticated user UUID and queue up for cloud backup.

### 3. Progressive Overload Engine
*   **Smart Increments**: Automatically monitors your sets and reps.
*   **Rule Enforcement**: If all sets of an exercise hit their maximum rep targets:
    *   **Upper Body Exercises**: Increments the suggested weight by exactly **+2.5 kg** for the next session.
    *   **Lower Body / Core Exercises**: Increments the suggested weight by exactly **+5.0 kg** for the next session.

### 4. Personal Record (PR) Engine
*   **Multi-Dimension Tracking**: Tracks personal achievements across three categories per exercise:
    *   **Weight PR**: Highest weight successfully completed.
    *   **Reps PR**: Highest number of repetitions completed in a single set.
    *   **Volume PR**: Highest overall volume (`weight * reps`) in a single set.
*   **Instant Notification**: Triggers micro-animations and achievements upon completing a workout session when a new PR is broken.

### 5. Rest Timer
*   **Active Guidance**: A visual, interactive rest timer counts down between sets.
*   **Foreground Notifications**: Keeps you notified on your device even if you briefly navigate away from the app.

---

## 🛠 Tech Stack

*   **Framework**: [Expo SDK 54](https://expo.dev/) (React Native 0.81)
*   **Language**: TypeScript (Strict type checking)
*   **Styling**: [NativeWind v4](https://www.nativewind.dev/) (Tailwind CSS for React Native)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand) + `persist` middleware for local hydration
*   **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + PostgREST + Gotrue Auth)
*   **Charts & Visualizations**: [Victory Native](https://formidable.com/open-source/victory-native/)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   Expo Go app on iOS/Android (for device testing)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/Nikhilsunny123/ironforge.git
    cd ironforge
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables. Create a `.env` file in the root directory:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

### Database Schema Setup
Deploy the PostgreSQL schema to your Supabase instance:
1.  Go to the **SQL Editor** in your Supabase dashboard.
2.  Paste the contents of [supabase/schema.sql](supabase/schema.sql).
3.  Click **Run** to execute the script and initialize tables, indexes, and Row-Level Security (RLS) policies.

---

## 📱 Running the Application

Start the Expo local development server:
```bash
npx expo start
```
*   Press **`a`** to open in an Android Emulator.
*   Press **`i`** to open in the iOS Simulator.
*   Scan the QR code in your terminal with your phone's camera (iOS) or Expo Go app (Android) to test on a physical device.

---

## 🧪 Running Automated Tests

IronForge includes an in-memory Node.js QA test suite to verify store mutations, progressive overload logic, PR detections, and guest-to-user migrations.

Run the test suite:
```bash
node scratch/testRunner.js
```
All **52/52 assertions** will execute and report color-coded pass/fail statuses.