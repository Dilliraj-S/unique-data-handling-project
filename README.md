# Unique — Enterprise Data & Email Intelligence Platform

![Next.js](https://img.shields.io/badge/Next.js-14.x-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![CoreUI](https://img.shields.io/badge/CoreUI-Enterprise_Suite-321FDB?style=for-the-badge)
![Chart.js](https://img.shields.io/badge/Chart.js-Data_Viz-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)
![TinyMCE](https://img.shields.io/badge/TinyMCE-Rich_Text-blue?style=for-the-badge&logo=tinymce&logoColor=white)
![DataTables](https://img.shields.io/badge/DataTables-Bootstrap_5-007bff?style=for-the-badge)

A full-featured enterprise frontend application built with **Next.js** and **React**, engineered for large-scale B2B data handling, automated workflow orchestration, interactive email campaign building, and real-time analytics.

---

## 🌟 Frontend Showcase Highlights

This repository demonstrates advanced frontend engineering patterns, complex client-side state management, and modern component architecture:

### 1. ✉️ Email Studio & Campaign Intelligence
- **Multi-Account Mail Configuration (`mailconfig.js`):** Centralized UI for managing multi-tenant SMTP/IMAP configurations, Gmail API OAuth integrations, warm-up schedules, and domain health status.
- **Visual Drift Email Builder (`driftemail.js`):** Interactive sequence composer integrating TinyMCE rich text editor, personalized token insertion, and conditional reply-tracking workflows.
- **Precision Email Scheduling (`emailscheduling.js`):** Configurable delivery windows, daily sending quotas, timezone management, and throttle safeguards.

### 2. 📊 Enterprise Analytics & Data Visualization
- **Multi-Tenant Dashboard:** Real-time metrics tracking email deliverability, bounce rates, open-tracking sync, and subscriber engagements.
- **Rich Charting:** Integrated with **Chart.js** and **Nivo** for geographic heatmaps, conversion funnels, and time-series telemetry.

### 3. 🗂️ High-Capacity Data Grids & CRUD Architecture
- **Dynamic Server-Driven DataTables:** Configured with pagination, multi-column search, column reordering, export capabilities, and bulk selection.
- **Query Chain & Nested Filters:** Visual UI for creating complex nested SQL/MongoDB queries and filtering millions of records intuitively.

### 4. ⚙️ Queue Orchestration & Background Monitor
- **Job Control Center:** Real-time visibility into active queue workers, job progress, failure diagnostics, and task dispatching.

---

## 🏗️ Architecture & Component Structure

The frontend layer is organized around reusable layout templates, modular views, and component-level CSS modules:

```text
src/
├── resources/
│   └── views/
│       ├── components/              # Reusable UI widgets, modals, headers, sidebars
│       ├── layouts/                 # Master application wrappers & layout grids
│       └── pages/
│           └── central/
│               ├── automations/     # Workflow automation builder UI
│               ├── crudoperations/  # Advanced data tables & CRUD forms
│               ├── dashboard/       # Analytics charts & KPI overview cards
│               ├── emailsystem/     # Mail configuration, drift sequences, scheduling
│               ├── filters/         # Dynamic query & token filter builders
│               ├── querychain/      # Sequential data-chaining interface
│               └── queuemanagement/ # Live queue status & worker controls
pages/
├── admin/                           # Administrative routing
├── api/                             # Next.js API endpoints & central controllers
└── central/                         # Central workspace page routes
```

---

## 🛠️ Tech Stack & Key Libraries

- **Framework:** [Next.js](https://nextjs.org/) (Pages Router + Server APIs)
- **UI Library:** [React 18](https://reactjs.org/)
- **Design System:** [CoreUI React v5](https://coreui.io/react/) & [Bootstrap 5](https://getbootstrap.com/)
- **Icons:** CoreUI Icons, FontAwesome Free, Bootstrap Icons
- **Data Visualization:** Chart.js, React-ChartJS, @nivo/pie, @nivo/geo
- **Rich Text Editing:** TinyMCE React
- **Date & Pickers:** Flatpickr
- **Data Grids:** DataTables.net (Bootstrap 5 integration)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or 20.x
- npm / pnpm / yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dilliraj-S/unique-data-handling-project.git
   cd unique-data-handling-project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

4. **Run the Next.js development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📁 Repository Organization

- **`pages/` & `src/`**: Next.js views, routes, UI components, and API controllers.
- **`public/`**: Static assets, brand images, and icons.
- **`docs/`**: Comprehensive system documentation, architectural blueprints, and client specs.
- **`workers/`**: Background data-handling queue workers (BullMQ / PM2).
- **`scripts/`**: Database migrations, seed scripts, and developer utilities.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
