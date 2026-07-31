# 📊 Career Principles - E-Commerce Sales Analytics & Voice AI Platform

An enterprise-grade, real-time e-commerce analytics platform and data directory featuring automated live data syncing, dynamic chart drill-downs, filtered CSV exporting, and an interactive **British Voice AI Agent** for stakeholder data Q&A.

Career Principles Analytics

## 🌟 Live Demo
- **Live Application:** [View Deployed App] :- https://navi-finder.lovable.app/

---

## 🚀 Key Features

### 📈 1. Real-Time Analytics Dashboard
- **Executive KPI Row:** Real-time metrics for *Total Revenue*, *Total Orders*, *Average Order Value (AOV)*, and *Unique Customers* with period-over-period delta indicators (green/red).
- **Interactive Visualizations:**
  - Revenue Over Time (Line Chart)
  - Revenue by Category (Horizontal Bar Chart)
  - Channel & Segment Distribution (Donut Charts)
  - Top 5 Products by Revenue (Ranked List)
  - Geographic Regional Revenue Breakdown
- **Dynamic Data Drill-Down:** Click directly on any chart or visual element to immediately slice, filter, and inspect underlying transaction data.

<img width="1912" height="885" alt="image" src="https://github.com/user-attachments/assets/c95643e0-307c-472c-85a3-cc860ce0fbe3" />


### 🎙️ 2. Voice AI Assistant (British Accent)
- **Interactive Q&A:** Stakeholders can ask natural-language voice questions regarding sales performance, revenue trends, top products, or regional breakdowns.
- **Instant Vocal Response:** Powered by voice synthesis technology to deliver spoken insights in an executive British tone.

<img width="1912" height="881" alt="image" src="https://github.com/user-attachments/assets/897a3a06-0b04-4762-ae6e-bd68ee0f5ddf" />


### 📋 3. Searchable Directory & Filtered CSV Export
- **Multi-Filter Sidebar:** Filter directory and dashboard simultaneously by *Category*, *Region*, *Customer Segment*, *Channel*, and *Payment Method*.
- **Smart Date Range Picker:** Custom time-window filtering (Defaults to last 90 days).
- **Targeted CSV Export:** Export only the current filtered/searched view with human-readable, cleaned column headers (e.g., `Order ID` instead of `orderId`).

<img width="1920" height="879" alt="image" src="https://github.com/user-attachments/assets/a926c777-524a-4401-a2c5-be662547216f" />


### 🔄 4. Live Sync & Data Resilience
- **OneDrive/Excel Live Connector:** Fetches sales data directly from `ecommerce_sales.xlsx`.
- **Background Auto-Refresh:** Automatically polls every 30 seconds to keep data synchronized without page reloads.
- **Fail-Safe Mechanism:** Displays loading skeletons on boot; retains last successful data cache if a fetch fails, ensuring zero downtime for users.
- **Live Status Indicator:** Real-time pulsing green badge indicating live system status and exact "Last Updated" timestamp.

---

## 🎨 Design & Brand Identity

Built to mirror the official **Career Principles** visual language:
- **Primary Color (`#056CF2`):** Buttons, links, active state indicators, chart accents.
- **Deep Navy (`#073673`):** Header background, bold headings, secondary chart accents.
- **Minimalist Aesthetic:** Clean UI, zero chart clutter, consistent rounded corners, subtle borders, and contextual hover tooltips across all visual elements.

<img width="1920" height="891" alt="image" src="https://github.com/user-attachments/assets/a494ba01-dca9-4cbf-a779-fdcd6dc7e32b" />


---

## 🛠️ Tech Stack

- **Frontend:** React.js, JavaScript (ES6+), HTML5, CSS3 / Tailwind CSS
- **Visualization:** Recharts / Chart.js
- **AI & Voice:** Interactive Voice Agent API / Speech Synthesis API
- **Data Integration:** Microsoft OneDrive / Excel Connector REST API
- **Tooling:** Lovable AI Platform, Git, GitHub

---

## 📂 Project Architecture


## 📂 Project Architecture
career-principles-analytics/ ├── public/ │ ├── assets/ # Logo, images, icons ├── src/ │ ├── components/ │ │ ├── Header/ # Brand header with Live status indicator & Voice AI │ │ ├── Dashboard/ # KPIs, line/bar/donut charts, drill-down logic │ │ ├── Directory/ # Searchable orders table, CSV exporter │ │ ├── Sidebar/ # Dynamic dynamic filters │ │ └── VoiceAgent/ # British Voice AI agent component │ ├── services/ │ │ └── excelConnector.js # OneDrive polling script & fallback caching │ ├── styles/ │ └── App.jsx └── README.md


---

## ⚙️ Local Setup & Installation

1. **Clone the Repository:**
bash git clone https://github.com/yourusername/career-principles-analytics.git cd career-principles-analytics


2. **Install Dependencies:**
bash npm install


3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
env VITE_EXCEL_DATA_URL=your_onedrive_excel_link


4. **Start the Development Server:**
bash npm run dev


---

## 👨‍💻 Developer & Attributions

- **Developer:** https://github.com/Anticyclone3
- **LinkedIn:** https://www.linkedin.com/in/arya-marale-a74512283/
- **Design System:** Inspired by https://youtu.be/p_UE_viX9-k?si=16M4q7Js1DvC4Ix8
